import type { Context } from './context'
import type { Middleware } from './middleware'
import type { DecoratedMiddleware } from './middleware-decorated'

describe('decorateMiddleware', () => {
  const decorated = {} as DecoratedMiddleware<{ user?: string }, { auth: true, user: string }, { name: string }, unknown, Record<never, never>>

  it('assignable to middleware', () => {
    const decorated = {} as DecoratedMiddleware<Context, Record<never, never>, { input: 'input' }, unknown, Record<never, never>>
    const mid: Middleware<Context, Record<never, never>, { input: 'input' }, unknown, Record<never, never>> = decorated

    const decorated2 = {} as DecoratedMiddleware<Context, { extra: boolean }, unknown, 'output', Record<never, never>>
    const mid2: Middleware<Context, { extra: boolean }, unknown, 'output', Record<never, never>> = decorated2
  })

  it('can map input', () => {
    const mapped = decorated.mapInput((input: 'something') => ({ name: input }))

    expectTypeOf(mapped).toEqualTypeOf<
      DecoratedMiddleware<{ user?: string }, { auth: true, user: string }, 'something', unknown, Record<never, never>>
    >()
  })

  it('can concat', () => {
    const mapped = decorated.concat(
      ({ next }, input: { age: number }) => next({ context: { db: true } }),
    )

    expectTypeOf(mapped).toEqualTypeOf<
      DecoratedMiddleware<
        { user?: string },
        { auth: true, user: string } & { db: boolean },
        { name: string } & { age: number },
        unknown,
        Record<never, never>
      >
    >()
  })

  it('can concat with map input', () => {
    const mapped = decorated.concat(
      ({ next }, input: { age: number }) => next({ context: { db: true } }),
      (input: { year: number }) => ({ age: 123 }),
    )

    expectTypeOf(mapped).toEqualTypeOf<
      DecoratedMiddleware<
        { user?: string },
        { auth: true, user: string } & { db: boolean },
        { name: string } & { year: number },
        unknown,
        Record<never, never>
      >
    >()

    decorated.concat(
      ({ next }, input: { age: number }) => next({ context: { db: true } }),
      // @ts-expect-error - invalid return input
      (input: { year: number }) => ({ age: '123' }),
    )
  })

  it('can concat and prevent conflict on context', () => {
    const mapped = decorated.concat(
      ({ next }) => next({ context: { db: true } }),
    )

    expectTypeOf(mapped).toEqualTypeOf<
      DecoratedMiddleware<
        { user?: string },
        { auth: true, user: string } & { db: boolean },
        { name: string },
        unknown,
        Record<never, never>
      >
    >()

    decorated.concat(
      // @ts-expect-error - user is not assignable to existing user context
      (input, context, meta) => next({ context: { user: true } }),
    )

    decorated.concat(
      // @ts-expect-error - user is not assignable to existing user context
      (input, context, meta) => next({ context: { user: true } }),
      () => 'anything',
    )
  })
})
