import { ORPCError, os } from '@orpc/server'
import { createFetchHandler } from '@orpc/server/fetch'
import { z } from 'zod'
import { createProcedureClient } from './procedure'

describe('createProcedureClient', () => {
  const schema = z.object({
    value: z.string(),
  })
  const ping = os.input(schema).func((_, __, { path }) => path)
  const router = os.router({
    ping,
    nested: {
      ping,
    },
  })
  const handler = createFetchHandler({
    router,
  })
  const orpcFetch: typeof fetch = async (...args) => {
    const request = new Request(...args)
    const response = await handler({
      prefix: '/orpc',
      request,
      context: {},
    })
    return response
  }

  it('types', () => {
    const schema = z.object({
      value: z.string(),
    })
    const client = createProcedureClient<
      typeof schema,
      undefined,
      { age: number }
    >({} as any)

    expectTypeOf(client).toEqualTypeOf<
      (input: { value: string }) => Promise<{ age: number }>
    >()

    const client2 = createProcedureClient<
      undefined,
      typeof schema,
      { value: string }
    >({} as any)

    expectTypeOf(client2).toEqualTypeOf<
      (input: unknown) => Promise<{ value: string }>
    >()
  })

  it('simple', async () => {
    const client = createProcedureClient({
      baseURL: 'http://localhost:3000/orpc',
      fetch: orpcFetch,
      path: ['ping'],
    })

    const result = await client({ value: 'hello' })

    expect(result).toEqual(['ping'])

    const client2 = createProcedureClient({
      baseURL: 'http://localhost:3000/orpc',
      fetch: orpcFetch,
      path: ['nested', 'ping'],
    })

    const result2 = await client2({ value: 'hello' })

    expect(result2).toEqual(['nested', 'ping'])
  })

  it('on known error', () => {
    const client = createProcedureClient({
      baseURL: 'http://localhost:3000/orpc',
      fetch: orpcFetch,
      path: ['ping'],
    })

    expect(client({ value: {} })).rejects.toThrowError(
      'Validation input failed',
    )
  })

  it('on unknown error', () => {
    const orpcFetch: typeof fetch = async () => {
      return new Response(JSON.stringify({}), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    }

    const client = createProcedureClient({
      baseURL: 'http://localhost:3000/orpc',
      fetch: orpcFetch,
      path: ['ping'],
    })

    expect(client({ value: 'hello' })).rejects.toThrowError(
      'Cannot parse response.',
    )
  })

  it('transformer', async () => {
    const router = os.router({
      ping: os
        .input(z.object({ value: z.date() }))
        .func(input => input.value),
    })

    const handler = createFetchHandler({
      router,
    })

    const client = createProcedureClient({
      path: ['ping'],
      baseURL: 'http://localhost:3000/orpc',
      fetch: (...args) => {
        const request = new Request(...args)
        return handler({
          prefix: '/orpc',
          request,
          context: {},
        })
      },
    })

    const now = new Date()
    expect(await client({ value: now })).toEqual(now)
  })

  it('error include data', async () => {
    const router = os.router({
      ping: os.func((input) => {
        throw new ORPCError({
          code: 'BAD_GATEWAY',
          data: {
            value: 'from error',
          },
        })
      }),
    })

    const handler = createFetchHandler({
      router,
    })

    const client = createProcedureClient({
      path: ['ping'],
      baseURL: 'http://localhost:3000/orpc',
      fetch: (...args) => {
        const request = new Request(...args)
        return handler({
          prefix: '/orpc',
          request,
          context: {},
        })
      },
    })

    let error: any
    try {
      await client(undefined)
    }
    catch (e) {
      error = e
    }

    expect(error).toBeInstanceOf(ORPCError)
    expect(error.code).toEqual('BAD_GATEWAY')
    expect(error.data).toEqual({ value: 'from error' })
  })
})

describe('upload file', () => {
  const router = os.router({
    signal: os.input(z.instanceof(Blob)).func((input) => {
      return input
    }),
    multiple: os
      .input(
        z.object({ first: z.instanceof(Blob), second: z.instanceof(Blob) }),
      )
      .func((input) => {
        return input
      }),
  })

  const handler = createFetchHandler({ router })

  const orpcFetch: typeof fetch = async (...args) => {
    const request = new Request(...args)
    const response = await handler({
      prefix: '/orpc',
      request,
      context: {},
    })
    return response
  }

  const blob1 = new Blob(['hello'], { type: 'text/plain;charset=utf-8' })
  const blob2 = new Blob(['"world"'], { type: 'image/png' })
  const blob3 = new Blob(['unnoq'], { type: 'application/octet-stream' })

  it('single file', async () => {
    const client = createProcedureClient({
      baseURL: 'http://localhost:3000/orpc',
      fetch: orpcFetch,
      path: ['signal'],
    })

    const output = await client(blob1)

    expect(output).toBeInstanceOf(Blob)
    expect(output.type).toBe('text/plain;charset=utf-8')
    expect(await output.text()).toBe('hello')
  })

  it('multiple file', async () => {
    const client = createProcedureClient({
      baseURL: 'http://localhost:3000/orpc',
      fetch: orpcFetch,
      path: ['multiple'],
    })

    const output = await client({ first: blob3, second: blob2 })

    const file0 = output.first
    const file1 = output.second

    expect(file0).toBeInstanceOf(Blob)
    expect(file0.type).toBe('application/octet-stream')
    expect(await file0.text()).toBe('unnoq')

    expect(file1).toBeInstanceOf(Blob)
    expect(file1.type).toBe('image/png')
    expect(await file1.text()).toBe('"world"')
  })
})
