import { z } from 'zod'
import { createRouterCaller, initORPC } from '.'

describe('createRouterCaller', () => {
  let internal = false
  let context = { auth: true }

  const orpc = initORPC.context<{ auth?: boolean }>()

  const ping = orpc
    .input(z.object({ value: z.string().transform((v) => Number(v)) }))
    .output(z.object({ value: z.number().transform((v) => v.toString()) }))
    .handler((input, context, meta) => {
      expect(context).toEqual(context)
      expect(meta.internal).toEqual(internal)

      return input
    })

  const pong = orpc.handler((_, context, meta) => {
    expect(context).toEqual(context)
    expect(meta.internal).toBe(internal)

    return { value: true }
  })

  const router = orpc.router({
    ping,
    pong,
    nested: {
      ping,
      pong,
    },
  })

  it('infer context', () => {
    createRouterCaller({
      router,
      // @ts-expect-error invalid context
      context: { auth: 123 },
    })

    createRouterCaller({
      router,
      context,
    })
  })

  it('with validate', () => {
    const caller = createRouterCaller({
      router,
      context,
      internal,
    })

    expectTypeOf(caller.ping).toMatchTypeOf<
      (input: { value: string }) => Promise<{
        value: string
      }>
    >()

    expectTypeOf(caller.pong).toMatchTypeOf<
      (input: unknown) => Promise<{
        value: boolean
      }>
    >()

    expectTypeOf(caller.nested.ping).toMatchTypeOf<
      (input: { value: string }) => Promise<{
        value: string
      }>
    >()

    expectTypeOf(caller.nested.pong).toMatchTypeOf<
      (input: unknown) => Promise<{
        value: boolean
      }>
    >()

    expect(caller.ping({ value: '123' })).resolves.toEqual({ value: '123' })
    expect(caller.pong({ value: '123' })).resolves.toEqual({ value: true })

    expect(caller.nested.ping({ value: '123' })).resolves.toEqual({
      value: '123',
    })
    expect(caller.nested.pong({ value: '123' })).resolves.toEqual({
      value: true,
    })

    // @ts-expect-error
    expect(caller.ping({ value: 123 })).rejects.toThrowError(
      'Validation input failed',
    )

    // @ts-expect-error
    expect(caller.nested.ping({ value: true })).rejects.toThrowError(
      'Validation input failed',
    )
  })

  it('without validate', () => {
    internal = true
    context = { auth: false }

    const caller = createRouterCaller({
      router,
      context,
      internal,
      validate: false,
    })

    expectTypeOf(caller.ping).toMatchTypeOf<
      (input: { value: number }) => Promise<{
        value: number
      }>
    >()

    expectTypeOf(caller.pong).toMatchTypeOf<
      (input: unknown) => Promise<{
        value: boolean
      }>
    >()

    expectTypeOf(caller.nested.ping).toMatchTypeOf<
      (input: { value: number }) => Promise<{
        value: number
      }>
    >()

    expectTypeOf(caller.nested.pong).toMatchTypeOf<
      (input: unknown) => Promise<{
        value: boolean
      }>
    >()

    expect(caller.ping({ value: 123 })).resolves.toEqual({ value: 123 })
    expect(caller.pong({ value: 123 })).resolves.toEqual({ value: true })
    expect(caller.nested.ping({ value: 123 })).resolves.toEqual({ value: 123 })
    expect(caller.nested.pong({ value: 123 })).resolves.toEqual({ value: true })

    // @ts-expect-error it's not validate so bellow still works
    expect(caller.ping({ value: '123' })).resolves.toEqual({ value: '123' })
  })

  it('path', () => {
    const ping = orpc.handler((_, __, { path }) => {
      return path
    })

    const router = orpc.router({
      ping,
      nested: {
        ping,
        child: {
          ping,
        },
      },
    })

    const caller = createRouterCaller({
      router: router,
      context,
    })

    expect(caller.ping('')).resolves.toEqual(['ping'])
    expect(caller.nested.ping('')).resolves.toEqual(['nested', 'ping'])
    expect(caller.nested.child.ping('')).resolves.toEqual([
      'nested',
      'child',
      'ping',
    ])
  })
})
