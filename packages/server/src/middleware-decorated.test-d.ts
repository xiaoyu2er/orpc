import type { Middleware } from './middleware'
import type { DecoratedMiddleware } from './middleware-decorated'
import type { WELL_CONTEXT } from './types'

describe('decorateMiddleware', () => {
  const decorated = {} as DecoratedMiddleware<{ user?: string }, { auth: true, user: string }, { name: string }, unknown>

  it('assignable to middleware', () => {
    const decorated = {} as DecoratedMiddleware<WELL_CONTEXT, undefined, { input: 'input' }, unknown>
    const mid: Middleware<WELL_CONTEXT, undefined, { input: 'input' }, unknown> = decorated

    const decorated2 = {} as DecoratedMiddleware<WELL_CONTEXT, { extra: boolean }, unknown, 'output'>
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
      ({ next }, input: { age: number }) => next({ context: { db: true } }),
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
      ({ next }, input: { age: number }) => next({ context: { db: true } }),
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
        unknown
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
