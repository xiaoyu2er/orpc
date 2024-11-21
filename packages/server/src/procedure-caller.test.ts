import { z } from 'zod'
import { createProcedureCaller, os } from '.'

describe('createProcedureCaller', () => {
  let internal = false
  let path = ['ping']
  let context = { auth: true }

  const osw = os.context<{ auth?: boolean }>()
  const procedure = osw
    .input(z.object({ value: z.string().transform(v => Number(v)) }))
    .output(z.object({ value: z.number().transform(v => v.toString()) }))
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

    // @ts-expect-error - invalid input
    expect(caller({ value: {} })).rejects.toThrowError(
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
    const procedure = osw.handler(() => {
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

  it('middlewares', () => {
    const ref = { value: 0 }

    const mid1 = vi.fn(
      osw.middleware((input: { id: string }, context, meta) => {
        expect(input).toEqual({ id: '1' })

        expect(ref.value).toBe(0)
        ref.value++

        meta.onSuccess(() => {
          expect(ref.value).toBe(7)
          ref.value++
        })

        meta.onFinish(() => {
          expect(ref.value).toBe(8)
          ref.value++
        })

        return {
          context: {
            userId: '1',
          },
        }
      }),
    )

    const mid2 = vi.fn(
      osw.middleware((input, context, meta) => {
        expect(ref.value).toBe(1)
        ref.value++

        meta.onSuccess(() => {
          expect(ref.value).toBe(5)
          ref.value++
        })

        meta.onFinish(() => {
          expect(ref.value).toBe(6)
          ref.value++
        })
      }),
    )

    const ping = osw
      .input(z.object({ id: z.string() }))
      .use(mid1)
      .use(mid2)
      .handler((input, context, meta) => {
        expect(context).toEqual({ userId: '1', auth: false })

        expect(ref.value).toBe(2)
        ref.value++

        meta.onSuccess(() => {
          expect(ref.value).toBe(3)
          ref.value++
        })

        meta.onFinish(() => {
          expect(ref.value).toBe(4)
          ref.value++
        })

        return 'pong'
      })

    const caller = createProcedureCaller({
      procedure: ping,
      context: { auth: false },
    })

    expect(caller({ id: '1' })).resolves.toEqual('pong')
  })

  it('hooks', async () => {
    const ref = { value: 0 }

    const caller = createProcedureCaller({
      procedure,
      context,
      internal,
      path,
      hooks: (context, meta) => {
        expect(context).toEqual(context)
        expect(meta.internal).toBe(internal)
        expect(meta.path).toBe(path)
        expect(meta.procedure).toBe(procedure)

        expect(ref.value).toBe(0)
        ref.value++

        meta.onSuccess(() => {
          expect(ref.value).toBe(1)
          ref.value++
        })

        meta.onFinish(() => {
          expect(ref.value).toBe(2)
          ref.value++

          throw new Error('foo')
        })
      },
    })

    await expect(caller({ value: '1243' })).rejects.toThrow('foo')
    expect(ref.value).toBe(3)
  })
})
