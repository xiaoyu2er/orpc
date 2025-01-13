import type { ORPCErrorConstructorMap } from './error'
import type { Middleware, MiddlewareNextFn, MiddlewareOptions, MiddlewareOutputFn } from './middleware'
import type { ANY_PROCEDURE } from './procedure'
import { z } from 'zod'

const baseErrors = {
  code: {
    status: 500,
    message: 'Internal Server Error',
    data: z.object({
      why: z.string(),
    }),
  },
}

describe('middleware', () => {
  it('just a function', () => {
    const mid: Middleware<{ auth: boolean }, undefined, unknown, unknown, ORPCErrorConstructorMap<typeof baseErrors>> = ({ context, path, procedure, signal, next, errors }, input, output) => {
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<{ auth: boolean }>()
      expectTypeOf(path).toEqualTypeOf<string[]>()
      expectTypeOf(procedure).toEqualTypeOf<ANY_PROCEDURE>()
      expectTypeOf(signal).toEqualTypeOf<undefined | InstanceType<typeof AbortSignal>>()
      expectTypeOf(output).toEqualTypeOf<MiddlewareOutputFn<unknown>>()
      expectTypeOf(next).toEqualTypeOf<MiddlewareNextFn<unknown>>()
      expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrors>>()

      return next({})
    }

    const mid2: Middleware<{ auth: boolean }, undefined, unknown, unknown, Record<never, never>> = async ({ context, path, procedure, signal, next }, input, output) => {
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<{ auth: boolean }>()
      expectTypeOf(path).toEqualTypeOf<string[]>()
      expectTypeOf(procedure).toEqualTypeOf<ANY_PROCEDURE>()
      expectTypeOf(signal).toEqualTypeOf<undefined | InstanceType<typeof AbortSignal>>()
      expectTypeOf(output).toEqualTypeOf<MiddlewareOutputFn<unknown>>()
      expectTypeOf(next).toEqualTypeOf<MiddlewareNextFn<unknown>>()

      return await next({})
    }

    // @ts-expect-error - missing return type
    const mid3: Middleware<{ auth: boolean }, undefined, unknown, unknown> = () => {
    }

    // @ts-expect-error - missing return type
    const mid4: Middleware<{ auth: boolean }, undefined, unknown, unknown> = async () => {
    }
  })

  it('require return valid extra context', () => {
    const mid0: Middleware<undefined, undefined, unknown, unknown, Record<never, never>> = ({ next }) => {
      return next({ })
    }

    const mid: Middleware<undefined, { userId: string }, unknown, unknown, Record<never, never>> = ({ next }) => {
      return next({ context: { userId: '1' } })
    }

    // @ts-expect-error invalid extra context
    const mid2: Middleware<undefined, { userId: string }, unknown, unknown> = ({ next }) => {
      return next({ context: { userId: 1 } })
    }

    const mid3: Middleware<undefined, { userId: string }, unknown, unknown, Record<never, never>> = ({ next }) => {
      // @ts-expect-error missing extra context
      return next({})
    }
  })

  it('can type input', () => {
    const mid: Middleware<undefined, undefined, { id: string }, unknown, Record<never, never>> = ({ next }, input) => {
      expectTypeOf(input).toEqualTypeOf<{ id: string }>()

      return next({})
    }
  })

  it('can type output', () => {
    const mid: Middleware<undefined, undefined, unknown, { id: string }, Record<never, never>> = async ({ next }, input, output) => {
      const result = await next({})

      expectTypeOf(result.output).toEqualTypeOf<{ id: string }>()

      return output({ id: '1' })
    }

    const mid2: Middleware<undefined, undefined, unknown, { id: string }, Record<never, never>> = async (_, __, output) => {
      // @ts-expect-error invalid output
      return output({ id: 123 })
    }
  })

  it('can infer types from function', () => {
    const handler = ({ next }: MiddlewareOptions<{ context: 'context' }, 'output', Record<never, never>>, input: 'input', output: MiddlewareOutputFn<'output'>) => {
      return next({ context: { extra: 'extra' as const } })
    }

    type Inferred = typeof handler extends Middleware<infer TContext, infer TExtraContext, infer TInput, infer TOutput, infer TErrorConstructorMap>
      ? [TContext, TExtraContext, TInput, TOutput, TErrorConstructorMap]
      : never

    expectTypeOf<Inferred>().toEqualTypeOf<
      [{ context: 'context' }, { extra: 'extra' }, 'input', 'output', Record<never, never>]
    >()
  })
})
