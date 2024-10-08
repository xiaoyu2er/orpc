import { z } from 'zod'
import { createProcedureCaller, initORPC } from '.'

describe('createProcedureCaller', () => {
  let internal = false
  let path = ['ping']
  let context = { auth: true }

  const orpc = initORPC.context<{ auth?: boolean }>()
  const procedure = orpc
    .input(z.object({ value: z.string().transform((v) => Number(v)) }))
    .output(z.object({ value: z.number().transform((v) => v.toString()) }))
    .handler((input, context, meta) => {
      expect(context).toEqual(context)
      expect(meta.internal).toBe(internal)
      expect(meta.path).toBe(path)

      return input
    })

  it('infer context', () => {
    createProcedureCaller({
      procedure,
      // @ts-expect-error invalid context
      context: { auth: 123 },
    })

    createProcedureCaller({
      procedure,
      context,
    })
  })

  it('with validate', async () => {
    const caller = createProcedureCaller({
      procedure,
      context,
      internal,
      path,
    })

    expectTypeOf(caller).toMatchTypeOf<
      (input: { value: string }) => Promise<{
        value: string
      }>
    >()

    expect(await caller({ value: '123' })).toEqual({ value: '123' })

    // @ts-expect-error
    expect(caller({ value: 123 })).rejects.toThrowError(
      'Validation input failed',
    )
  })

  it('without validate', async () => {
    internal = true
    path = []
    context = { auth: false }

    const caller = createProcedureCaller({
      procedure,
      context,
      internal,
      path,
      validate: false,
    })

    expectTypeOf(caller).toMatchTypeOf<
      (input: { value: number }) => Promise<{
        value: number
      }>
    >()

    expect(await caller({ value: 123 })).toEqual({ value: 123 })

    // @ts-expect-error it's not validate so bellow still works
    expect(await caller({ value: '123' })).toEqual({ value: '123' })
  })

  it('without validate and schema', () => {
    const procedure = orpc.handler(() => {
      return { value: true }
    })

    const caller = createProcedureCaller({
      procedure,
      context,
      internal,
      validate: false,
    })

    expectTypeOf(caller).toMatchTypeOf<
      (value: unknown) => Promise<{ value: boolean }>
    >()

    expect(caller({ value: 123 })).resolves.toEqual({ value: true })
  })
})
