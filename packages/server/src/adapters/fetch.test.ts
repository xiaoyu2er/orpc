import { ORPC_HEADER, ORPC_HEADER_VALUE } from '@orpc/contract'
import { oz } from '@orpc/zod'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { ORPCError, os } from '..'
import { createFetchHandler } from './fetch'

const router = os.router({
  throw: os.handler(() => {
    throw new Error('test')
  }),
  ping: os.handler(() => {
    return 'ping'
  }),
  ping2: os.route({ method: 'GET', path: '/ping2' }).handler(() => {
    return 'ping2'
  }),
})

const handler = createFetchHandler({ router })

describe('simple', () => {
  const osw = os.context<{ auth?: boolean }>()
  const router = osw.router({
    ping: osw.handler(async () => 'pong'),
    ping2: osw
      .route({ method: 'GET', path: '/ping2' })
      .handler(async () => 'pong2'),
  })
  const handler = createFetchHandler({
    router,
  })

  it('200: public url', async () => {
    const response = await handler({
      prefix: '/orpc',
      request: new Request('http://localhost/orpc/ping', {
        method: 'POST',
      }),
      context: { auth: true },
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual('pong')

    const response2 = await handler({
      prefix: '/orpc',
      request: new Request('http://localhost/orpc/ping2', {
        method: 'GET',
      }),
      context: { auth: true },
    })

    expect(response2.status).toBe(200)
    expect(await response2.json()).toEqual('pong2')
  })

  it('200: internal url', async () => {
    const response = await handler({
      request: new Request('http://localhost/ping'),
      context: { auth: true },
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual('pong')

    const response2 = await handler({
      prefix: '/orpc',
      request: new Request('http://localhost/orpc/ping2'),
      context: { auth: true },
    })

    expect(response2.status).toBe(200)
    expect(await response2.json()).toEqual('pong2')
  })

  it('404', async () => {
    const response = await handler({
      prefix: '/orpc',
      request: new Request('http://localhost/orpc/pingp', {
        method: 'POST',
      }),
      context: { auth: true },
    })

    expect(response.status).toBe(404)
  })
})

describe('procedure throw error', () => {
  it('unknown error', async () => {
    const response = await handler({
      request: new Request('https://local.com/throw', { method: 'POST' }),
    })

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      code: 'INTERNAL_SERVER_ERROR',
      status: 500,
      message: 'Internal server error',
    })
  })

  it('orpc error', async () => {
    const router = os.router({
      ping: os.handler(() => {
        throw new ORPCError({ code: 'TIMEOUT' })
      }),
    })

    const handler = createFetchHandler({ router })

    const response = await handler({
      request: new Request('https://local.com/ping', { method: 'POST' }),
    })

    expect(response.status).toBe(408)
    expect(await response.json()).toEqual({
      code: 'TIMEOUT',
      status: 408,
      message: '',
    })
  })

  it('orpc error with data', async () => {
    const router = os.router({
      ping: os.handler(() => {
        throw new ORPCError({
          code: 'PAYLOAD_TOO_LARGE',
          message: 'test',
          data: { max: '10mb' },
        })
      }),
    })

    const handler = createFetchHandler({ router })

    const response = await handler({
      request: new Request('https://local.com/ping', { method: 'POST' }),
    })

    expect(response.status).toBe(413)
    expect(await response.json()).toEqual({
      code: 'PAYLOAD_TOO_LARGE',
      status: 413,
      message: 'test',
      data: { max: '10mb' },
    })
  })

  it('orpc error with custom status', async () => {
    const router = os.router({
      ping: os.handler(() => {
        throw new ORPCError({
          code: 'PAYLOAD_TOO_LARGE',
          status: 100,
        })
      }),

      ping2: os.handler(() => {
        throw new ORPCError({
          code: 'PAYLOAD_TOO_LARGE',
          status: 488,
        })
      }),
    })

    const handler = createFetchHandler({ router })

    const response = await handler({
      request: new Request('https://local.com/ping', { method: 'POST' }),
    })

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      code: 'INTERNAL_SERVER_ERROR',
      status: 500,
      message: 'Internal server error',
    })

    const response2 = await handler({
      request: new Request('https://local.com/ping2', { method: 'POST' }),
    })

    expect(response2.status).toBe(488)
    expect(await response2.json()).toEqual({
      code: 'PAYLOAD_TOO_LARGE',
      status: 488,
      message: '',
    })
  })

  it('input validation error', async () => {
    const router = os.router({
      ping: os
        .input(z.object({}))
        .output(z.string())
        .handler(() => {
          return 'unnoq'
        }),
    })

    const handler = createFetchHandler({ router })

    const response = await handler({
      request: new Request('https://local.com/ping', { method: 'POST' }),
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      code: 'BAD_REQUEST',
      status: 400,
      message: 'Validation input failed',
      issues: [
        {
          code: 'invalid_type',
          expected: 'object',
          message: 'Required',
          path: [],
          received: 'undefined',
        },
      ],
    })
  })

  it('output validation error', async () => {
    const router = os.router({
      ping: os
        .input(z.string())
        .output(z.string())
        .handler(() => {
          return 12344 as any
        }),
    })

    const handler = createFetchHandler({ router })

    const response = await handler({
      request: new Request('https://local.com/ping', {
        method: 'POST',
        body: '"hi"',
      }),
    })

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      code: 'INTERNAL_SERVER_ERROR',
      status: 500,
      message: 'Validation output failed',
    })
  })
})

describe('hooks', () => {
  it('on success', async () => {
    const onSuccess = vi.fn()
    const onError = vi.fn()
    const onFinish = vi.fn()

    const handler = createFetchHandler({
      router,
      hooks: async (context, hooks) => {
        try {
          const response = await hooks.next()
          onSuccess(response)
          return response
        }
        catch (e) {
          onError(e)
          throw e
        }
        finally {
          onFinish()
        }
      },
    })

    await handler({
      prefix: '/orpc',
      request: new Request('http://localhost/orpc/ping', {
        method: 'POST',
      }),
    })

    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledTimes(0)
    expect(onFinish).toHaveBeenCalledTimes(1)

    expect(onSuccess.mock.calls[0]?.[0]).toBeInstanceOf(Response)
    expect(onFinish.mock.calls[0]?.[1]).toBe(undefined)
  })

  it('on failed', async () => {
    const onSuccess = vi.fn()
    const onError = vi.fn()
    const onFinish = vi.fn()

    const handler = createFetchHandler({
      router,
      hooks: async (context, hooks) => {
        try {
          const response = await hooks.next()
          onSuccess(response)
          return response
        }
        catch (e) {
          onError(e)
          throw e
        }
        finally {
          onFinish()
        }
      },
    })

    await handler({
      prefix: '/orpc',
      request: new Request('http://localhost/orpc/throw', {
        method: 'POST',
      }),
    })

    expect(onSuccess).toHaveBeenCalledTimes(0)
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onFinish).toHaveBeenCalledTimes(1)

    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(Error)
    expect(onError.mock.calls[0]?.[0]?.message).toBe('test')
    expect(onFinish.mock.calls[0]?.[0]).toBe(undefined)
  })
})

describe('file upload', () => {
  const router = os.router({
    signal: os.input(z.instanceof(Blob)).handler((input) => {
      return input
    }),
    multiple: os
      .input(
        z.object({ first: z.instanceof(Blob), second: z.instanceof(Blob) }),
      )
      .handler((input) => {
        return input
      }),
  })

  const handler = createFetchHandler({ router })

  const blob1 = new Blob(['hello'], { type: 'text/plain;charset=utf-8' })
  const blob2 = new Blob(['"world"'], { type: 'image/png' })
  const blob3 = new Blob(['unnoq'], { type: 'application/octet-stream' })

  it('single file', async () => {
    const rForm = new FormData()
    rForm.set('meta', JSON.stringify([]))
    rForm.set('maps', JSON.stringify([[]]))
    rForm.set('0', blob3)

    const response = await handler({
      prefix: '/orpc',
      request: new Request('http://localhost/orpc/signal', {
        method: 'POST',
        body: rForm,
        headers: {
          [ORPC_HEADER]: ORPC_HEADER_VALUE,
        },
      }),
    })

    expect(response.status).toBe(200)
    const form = await response.formData()

    const file0 = form.get('0') as File
    expect(file0).toBeInstanceOf(File)
    expect(file0.name).toBe('blob')
    expect(file0.type).toBe('application/octet-stream')
    expect(await file0.text()).toBe('unnoq')
  })

  it('multiple file', async () => {
    const form = new FormData()
    form.set('data', JSON.stringify({ first: blob1, second: blob2 }))
    form.set('meta', JSON.stringify([]))
    form.set('maps', JSON.stringify([['first'], ['second']]))
    form.set('0', blob1)
    form.set('1', blob2)

    const response = await handler({
      prefix: '/orpc',
      request: new Request('http://localhost/orpc/multiple', {
        method: 'POST',
        body: form,
        headers: {
          [ORPC_HEADER]: ORPC_HEADER_VALUE,
        },
      }),
    })

    expect(response.status).toBe(200)

    const form_ = await response.formData()
    const file0 = form_.get('0') as File
    const file1 = form_.get('1') as File

    expect(file0).toBeInstanceOf(File)
    expect(file0.name).toBe('blob')
    expect(file0.type).toBe('text/plain;charset=utf-8')
    expect(await file0.text()).toBe('hello')

    expect(file1).toBeInstanceOf(File)
    expect(file1.name).toBe('blob')
    expect(file1.type).toBe('image/png')
    expect(await file1.text()).toBe('"world"')
  })
})

describe('accept header', () => {
  const router = os.router({
    ping: os.handler(async () => 'pong'),
  })
  const handler = createFetchHandler({
    router,
  })

  it('application/json', async () => {
    const response = await handler({
      prefix: '/orpc',
      request: new Request('http://localhost/orpc/ping', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
      }),
    })

    expect(response.headers.get('Content-Type')).toEqual('application/json')

    expect(await response.json()).toEqual('pong')
  })

  it('multipart/form-data', async () => {
    const response = await handler({
      prefix: '/orpc',
      request: new Request('http://localhost/orpc/ping', {
        method: 'POST',
        headers: {
          Accept: 'multipart/form-data',
        },
      }),
    })

    expect(response.headers.get('Content-Type')).toContain(
      'multipart/form-data',
    )

    const form = await response.formData()
    expect(form.get('')).toEqual('pong')
  })

  it('application/x-www-form-urlencoded', async () => {
    const response = await handler({
      prefix: '/orpc',
      request: new Request('http://localhost/orpc/ping', {
        method: 'POST',
        headers: {
          Accept: 'application/x-www-form-urlencoded',
        },
      }),
    })

    expect(response.headers.get('Content-Type')).toEqual(
      'application/x-www-form-urlencoded',
    )

    const params = new URLSearchParams(await response.text())
    expect(params.get('')).toEqual('pong')
  })

  it('*/*', async () => {
    const response = await handler({
      prefix: '/orpc',
      request: new Request('http://localhost/orpc/ping', {
        method: 'POST',
        headers: {
          Accept: '*/*',
        },
      }),
    })

    expect(response.headers.get('Content-Type')).toEqual('application/json')
    expect(await response.json()).toEqual('pong')
  })

  it('invalid', async () => {
    const response = await handler({
      prefix: '/orpc',
      request: new Request('http://localhost/orpc/ping', {
        method: 'POST',
        headers: {
          Accept: 'invalid',
        },
      }),
    })

    expect(response.headers.get('Content-Type')).toEqual('application/json')
    expect(await response.json()).toEqual({
      code: 'NOT_ACCEPTABLE',
      message: 'Unsupported content-type: invalid',
      status: 406,
    })
  })
})

describe('dynamic params', () => {
  const router = os.router({
    deep: os
      .route({
        method: 'POST',
        path: '/{id}/{id2}',
      })
      .input(
        z.object({
          id: z.number(),
          id2: z.string(),
          file: oz.file(),
        }),
      )
      .handler(input => input),

    find: os
      .route({
        method: 'GET',
        path: '/{id}',
      })
      .input(
        z.object({
          id: z.number(),
        }),
      )
      .handler(input => input),
  })

  const handlers = [
    createFetchHandler({
      router,
    }),
    createFetchHandler({
      router,
      serverless: true,
    }),
  ]

  it.each(handlers)('should handle dynamic params', async (handler) => {
    const response = await handler({
      request: new Request('http://localhost/123'),
    })

    expect(response.status).toEqual(200)
    expect(response.headers.get('Content-Type')).toEqual('application/json')
    expect(await response.json()).toEqual({ id: 123 })
  })

  it.each(handlers)('should handle deep dynamic params', async (handler) => {
    const form = new FormData()
    form.append('file', new Blob(['hello']), 'hello.txt')

    const response = await handler({
      request: new Request('http://localhost/123/dfdsfds', {
        method: 'POST',
        body: form,
      }),
    })

    expect(response.status).toEqual(200)
    const rForm = await response.formData()
    expect(rForm.get('id')).toEqual('123')
    expect(rForm.get('id2')).toEqual('dfdsfds')
  })
})

describe('can control method on POST request', () => {
  const router = os.router({
    update: os
      .route({
        method: 'PUT',
        path: '/{id}',
      })
      .input(
        z.object({
          id: z.number(),
          file: oz.file(),
        }),
      )
      .handler(input => input),
  })

  const handlers = [
    createFetchHandler({
      router,
    }),
    createFetchHandler({
      router,
      serverless: true,
    }),
  ]

  it.each(handlers)('work', async (handler) => {
    const form = new FormData()
    form.set('file', new File(['hello'], 'hello.txt'))

    const response = await handler({
      request: new Request('http://localhost/123', {
        method: 'POST',
        body: form,
      }),
    })

    expect(response.status).toEqual(404)

    const response2 = await handler({
      request: new Request('http://localhost/123?method=PUT', {
        method: 'POST',
        body: form,
      }),
    })

    expect(response2.status).toEqual(200)
  })
})
