import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { ORPCError, createRouterHandler, initORPC } from '..'
import { ORPC_PROTOCOL_HEADER } from '../config'
import { fetchHandler } from './fetch'

const router = initORPC.router({
  throw: initORPC.handler(() => {
    throw new Error('test')
  }),
  ping: initORPC.handler(() => {
    return 'ping'
  }),
  ping2: initORPC.route({ method: 'GET', path: '/ping2' }).handler(() => {
    return 'ping2'
  }),
})

const handler = createRouterHandler({ router })

test('invalid request json', async () => {
  const response = await fetchHandler({
    prefix: '/orpc',
    handler,
    request: new Request('http://localhost/orpc.ping', {
      method: 'POST',
      body: 'INVALID_JSON',
    }),
    context: undefined,
  })

  expect(response.status).toBe(400)
  expect(await response.json()).toEqual({
    code: 'BAD_REQUEST',
    status: 400,
    message: 'Invalid JSON was received by the server.',
  })
})

describe('simple', () => {
  const orpc = initORPC.context<{ auth?: boolean }>()
  const router = orpc.router({
    ping: orpc.handler(async () => 'pong'),
    ping2: orpc
      .route({ method: 'GET', path: '/ping2' })
      .handler(async () => 'pong2'),
  })
  const handler = createRouterHandler({
    router,
  })

  it('200: public url', async () => {
    const response = await fetchHandler({
      prefix: '/orpc',
      handler,
      request: new Request('http://localhost/orpc.ping', {
        method: 'POST',
      }),
      context: { auth: true },
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toBe('pong')

    const response2 = await fetchHandler({
      prefix: '/orpc',
      handler,
      request: new Request('http://localhost/orpc/ping2', {
        method: 'GET',
      }),
      context: { auth: true },
    })

    expect(response2.status).toBe(200)
    expect(await response2.json()).toBe('pong2')
  })

  it('200: internal url', async () => {
    const response = await fetchHandler({
      handler,
      request: new Request('http://localhost/.ping', {
        headers: {
          [ORPC_PROTOCOL_HEADER]: '1',
        },
      }),
      context: { auth: true },
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toBe('pong')

    const response2 = await fetchHandler({
      prefix: '/orpc',
      handler,
      request: new Request('http://localhost/orpc.ping2', {
        headers: {
          [ORPC_PROTOCOL_HEADER]: '1',
        },
      }),
      context: { auth: true },
    })

    expect(response2.status).toBe(200)
    expect(await response2.json()).toBe('pong2')
  })

  it('404', async () => {
    const response = await fetchHandler({
      prefix: '/orpc',
      handler,
      request: new Request('http://localhost/orpc.pingp', {
        method: 'POST',
      }),
      context: { auth: true },
    })

    expect(response.status).toBe(404)
  })
})

describe('procedure throw error', () => {
  it('unknown error', async () => {
    const response = await fetchHandler({
      request: new Request('https://local.com/.throw', { method: 'POST' }),
      handler,
      context: undefined,
    })

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      code: 'INTERNAL_SERVER_ERROR',
      status: 500,
      message: 'Internal server error',
    })
  })

  it('orpc error', async () => {
    const router = initORPC.router({
      ping: initORPC.handler(() => {
        throw new ORPCError({ code: 'TIMEOUT' })
      }),
    })

    const handler = createRouterHandler({ router })

    const response = await fetchHandler({
      request: new Request('https://local.com/.ping', { method: 'POST' }),
      handler,
      context: undefined,
    })

    expect(response.status).toBe(408)
    expect(await response.json()).toEqual({
      code: 'TIMEOUT',
      status: 408,
      message: '',
    })
  })

  it('orpc error with data', async () => {
    const router = initORPC.router({
      ping: initORPC.handler(() => {
        throw new ORPCError({
          code: 'PAYLOAD_TOO_LARGE',
          message: 'test',
          data: { max: '10mb' },
        })
      }),
    })

    const handler = createRouterHandler({ router })

    const response = await fetchHandler({
      request: new Request('https://local.com/.ping', { method: 'POST' }),
      handler,
      context: undefined,
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
    const router = initORPC.router({
      ping: initORPC.handler(() => {
        throw new ORPCError({
          code: 'PAYLOAD_TOO_LARGE',
          status: 100,
        })
      }),

      ping2: initORPC.handler(() => {
        throw new ORPCError({
          code: 'PAYLOAD_TOO_LARGE',
          status: 488,
        })
      }),
    })

    const handler = createRouterHandler({ router })

    const response = await fetchHandler({
      request: new Request('https://local.com/.ping', { method: 'POST' }),
      handler,
      context: undefined,
    })

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      code: 'INTERNAL_SERVER_ERROR',
      status: 500,
      message: 'Internal server error',
    })

    const response2 = await fetchHandler({
      request: new Request('https://local.com/.ping2', { method: 'POST' }),
      handler,
      context: undefined,
    })

    expect(response2.status).toBe(488)
    expect(await response2.json()).toEqual({
      code: 'PAYLOAD_TOO_LARGE',
      status: 488,
      message: '',
    })
  })

  it('input validation error', async () => {
    const router = initORPC.router({
      ping: initORPC
        .input(z.string())
        .output(z.string())
        .handler(() => {
          return 'dinwwwh'
        }),
    })

    const handler = createRouterHandler({ router })

    const response = await fetchHandler({
      request: new Request('https://local.com/.ping', { method: 'POST' }),
      handler,
      context: undefined,
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      code: 'BAD_REQUEST',
      status: 400,
      message: 'Validation input failed',
      issues: [
        {
          code: 'invalid_type',
          message: 'Required',
          path: [],
          expected: 'string',
          received: 'undefined',
        },
      ],
    })
  })

  it('output validation error', async () => {
    const router = initORPC.router({
      ping: initORPC
        .input(z.string())
        .output(z.string())
        .handler(() => {
          return 12344 as any
        }),
    })

    const handler = createRouterHandler({ router })

    const response = await fetchHandler({
      request: new Request('https://local.com/.ping', {
        method: 'POST',
        body: '"hi"',
      }),
      handler,
      context: undefined,
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
  test('on success', async () => {
    const onSuccess = vi.fn()
    const onError = vi.fn()
    const onFinish = vi.fn()

    await fetchHandler({
      prefix: '/orpc',
      handler,
      request: new Request('http://localhost/orpc.ping', {
        method: 'POST',
      }),
      context: undefined,
      hooks: (context, hooks) => {
        hooks.onSuccess(onSuccess)
        hooks.onError(onError)
        hooks.onFinish(onFinish)
      },
    })

    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledTimes(0)
    expect(onFinish).toHaveBeenCalledTimes(1)

    expect(onSuccess.mock.calls[0]?.[0]).toBeInstanceOf(Response)
    expect(onFinish.mock.calls[0]?.[0]).toBeInstanceOf(Response)
    expect(onFinish.mock.calls[0]?.[1]).toBe(undefined)
  })

  test('on failed', async () => {
    const onSuccess = vi.fn()
    const onError = vi.fn()
    const onFinish = vi.fn()

    await fetchHandler({
      prefix: '/orpc',
      handler,
      request: new Request('http://localhost/orpc.throw', {
        method: 'POST',
      }),
      context: undefined,
      hooks: (_, hooks) => {
        hooks.onSuccess(onSuccess)
        hooks.onError(onError)
        hooks.onFinish(onFinish)
      },
    })

    expect(onSuccess).toHaveBeenCalledTimes(0)
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onFinish).toHaveBeenCalledTimes(1)

    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(Error)
    expect(onError.mock.calls[0]?.[0]?.message).toBe('test')
    expect(onFinish.mock.calls[0]?.[0]).toBe(undefined)
    expect(onFinish.mock.calls[0]?.[1]).toBeInstanceOf(Error)
    expect(onFinish.mock.calls[0]?.[1]?.message).toBe('test')
  })
})
