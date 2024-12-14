import type { DecoratedMiddleware, Middleware, MiddlewareMeta } from './middleware'
import type { WELL_CONTEXT } from './types'
import { decorateMiddleware } from './middleware'

describe('middleware', () => {
  it('just a function', () => {
    const mid: Middleware<{ auth: boolean }, undefined, unknown, unknown> = (input, context, meta) => {
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<{ auth: boolean }>()
      expectTypeOf(meta).toEqualTypeOf<MiddlewareMeta<unknown>>()

      return meta.next({})
    }

    const mid2: Middleware<{ auth: boolean }, undefined, unknown, unknown> = async (input, context, meta) => {
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<{ auth: boolean }>()
      expectTypeOf(meta).toEqualTypeOf<MiddlewareMeta<unknown>>()

      return await meta.next({})
    }

    // @ts-expect-error - missing return type
    const mid3: Middleware<{ auth: boolean }, undefined, unknown, unknown> = (input, context, meta) => {
    }

    // @ts-expect-error - missing return type
    const mid4: Middleware<{ auth: boolean }, undefined, unknown, unknown> = async (input, context, meta) => {
    }
  })

  it('require return valid extra context', () => {
    const mid0: Middleware<undefined, undefined, unknown, unknown> = (_, __, meta) => {
      return meta.next({ })
    }

    const mid: Middleware<undefined, { userId: string }, unknown, unknown > = (_, __, meta) => {
      return meta.next({ context: { userId: '1' } })
    }

    // @ts-expect-error invalid extra context
    const mid2: Middleware<undefined, { userId: string }, unknown, unknown> = (_, __, meta) => {
      return meta.next({ context: { userId: 1 } })
    }

    const mid3: Middleware<undefined, { userId: string }, unknown, unknown> = (_, __, meta) => {
      // @ts-expect-error missing extra context
      return meta.next({})
    }
  })

  it('can type input', () => {
    const mid: Middleware<undefined, undefined, { id: string }, unknown> = (input, context, meta) => {
      expectTypeOf(input).toEqualTypeOf<{ id: string }>()

      return meta.next({})
    }
  })

  it('can type output', () => {
    const mid: Middleware<undefined, undefined, unknown, { id: string }> = async (_, context, meta) => {
      const result = await meta.next({})

      expectTypeOf(result.output).toEqualTypeOf<{ id: string }>()

      return meta.output({ id: '1' })
    }

    // @ts-expect-error invalid output
    const mid2: Middleware<undefined, undefined, unknown, { id: string }> = async (_, context, meta) => {
      return meta.output({ id: 123 })
    }
  })

  it('can infer types from function', () => {
    const func = (input: 'input', context: { context: 'context' }, meta: MiddlewareMeta<'output'>) => {
      return meta.next({ context: { extra: 'extra' as const } })
    }

    type Inferred = typeof func extends Middleware<infer TContext, infer TExtraContext, infer TInput, infer TOutput>
      ? [TContext, TExtraContext, TInput, TOutput]
      : never

    expectTypeOf<Inferred>().toEqualTypeOf<
      [{ context: 'context' }, { extra: 'extra' }, 'input', 'output']
    >()
  })
})

describe('decorateMiddleware', () => {
  const decorated = decorateMiddleware(
    (input: { name: string }, context: { user?: string }, meta) => meta.next({ context: { auth: true as const, user: 'string' } }),
  )

  it('assignable to middleware', () => {
    const decorated = decorateMiddleware((input: { input: 'input' }, context, meta) => meta.next({}))
    const mid: Middleware<WELL_CONTEXT, undefined, { input: 'input' }, unknown> = decorated

    const decorated2 = decorateMiddleware((input, context, meta: MiddlewareMeta<'output'>) => meta.next({ context: { extra: true } }))
    const mid2: Middleware<WELL_CONTEXT, { extra: boolean }, unknown, 'output'> = decorated2
  })

  it('can map input', () => {
    const mapped = decorated.mapInput((input: 'something') => ({ name: input }))

    expectTypeOf(mapped).toEqualTypeOf<
      DecoratedMiddleware<{ user?: string }, { auth: true, user: string }, 'something', unknown>
    >()
  })

  it('can concat', () => {
    const mapped = decorated.concat(
      (input: { age: number }, context, meta) => meta.next({ context: { db: true } }),
    )

    expectTypeOf(mapped).toEqualTypeOf<
      DecoratedMiddleware<
        { user?: string },
        { auth: true, user: string } & { db: boolean },
        { name: string } & { age: number },
        unknown
      >
    >()
  })

  it('can concat with map input', () => {
    const mapped = decorated.concat(
      (input: { age: number }, context, meta) => meta.next({ context: { db: true } }),
      (input: { year: number }) => ({ age: 123 }),
    )

    expectTypeOf(mapped).toEqualTypeOf<
      DecoratedMiddleware<
        { user?: string },
        { auth: true, user: string } & { db: boolean },
        { name: string } & { year: number },
        unknown
      >
    >()

    decorated.concat(
      (input: { age: number }, context, meta) => meta.next({ context: { db: true } }),
      // @ts-expect-error - invalid return input
      (input: { year: number }) => ({ age: '123' }),
    )
  })

  it('can concat and prevent conflict on context', () => {
    const mapped = decorated.concat(
      (input, context, meta) => meta.next({ context: { db: true } }),
    )

    expectTypeOf(mapped).toEqualTypeOf<
      DecoratedMiddleware<
        { user?: string },
        { auth: true, user: string } & { db: boolean },
        { name: string },
        unknown
      >
    >()

    decorated.concat(
      // @ts-expect-error - user is not assignable to existing user context
      (input, context, meta) => meta.next({ context: { user: true } }),
    )

    decorated.concat(
      // @ts-expect-error - user is not assignable to existing user context
      (input, context, meta) => meta.next({ context: { user: true } }),
      () => 'anything',
    )
  })
})
