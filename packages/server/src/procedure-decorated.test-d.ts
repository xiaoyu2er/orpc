import type { Client, ClientRest, ORPCError } from '@orpc/contract'
import type { ORPCErrorConstructorMap } from './error'
import type { Middleware, MiddlewareOutputFn } from './middleware'
import type { ANY_PROCEDURE } from './procedure'
import type { DecoratedProcedure } from './procedure-decorated'
import type { WELL_CONTEXT } from './types'
import { z } from 'zod'

const baseSchema = z.object({ val: z.string().transform(v => Number.parseInt(v)) })
const baseErrors = {
  CODE: {
    data: z.object({ why: z.string() }),
  },
}
const decorated = {} as DecoratedProcedure<{ auth: boolean }, { db: string }, typeof baseSchema, typeof baseSchema, { val: string }, typeof baseErrors>

describe('self chainable', () => {
  it('prefix', () => {
    expectTypeOf(decorated.prefix('/test')).toEqualTypeOf<typeof decorated>()

    // @ts-expect-error - invalid prefix
    decorated.prefix('')
    // @ts-expect-error - invalid prefix
    decorated.prefix(1)
  })

  it('route', () => {
    expectTypeOf(decorated.route({ path: '/test', method: 'GET' })).toEqualTypeOf<typeof decorated>()
    expectTypeOf(decorated.route({
      path: '/test',
      method: 'GET',
      description: 'description',
      summary: 'summary',
      deprecated: true,
      tags: ['tag1', 'tag2'],
    })).toEqualTypeOf<typeof decorated>()

    // @ts-expect-error - invalid method
    decorated.route({ method: 'PUTT' })
    // @ts-expect-error - invalid path
    decorated.route({ path: 1 })
    // @ts-expect-error - invalid tags
    decorated.route({ tags: [1] })
  })

  it('use middleware', () => {
    const i = decorated
      .use(({ context, path, next, procedure, errors }, input, output) => {
        expectTypeOf(input).toEqualTypeOf<{ val: number }>()
        expectTypeOf(context).toEqualTypeOf<{ auth: boolean } & { db: string }>()
        expectTypeOf(path).toEqualTypeOf<string[]>()
        expectTypeOf(procedure).toEqualTypeOf<ANY_PROCEDURE>()
        expectTypeOf(output).toEqualTypeOf<MiddlewareOutputFn<{ val: string }>>()
        expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrors>>()

        return next({
          context: {
            dev: true,
          },
        })
      })
      .use(({ context, path, next, procedure, errors }, input, output) => {
        expectTypeOf(input).toEqualTypeOf<{ val: number }>()
        expectTypeOf(context).toEqualTypeOf<{ auth: boolean } & { db: string } & { dev: boolean }>()
        expectTypeOf(path).toEqualTypeOf<string[]>()
        expectTypeOf(procedure).toEqualTypeOf<ANY_PROCEDURE>()
        expectTypeOf(output).toEqualTypeOf<MiddlewareOutputFn<{ val: string }>>()
        expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrors>>()

        return next({})
      })

    expectTypeOf(i).toEqualTypeOf<
      DecoratedProcedure<
        { auth: boolean },
        { db: string } & { dev: boolean },
        typeof baseSchema,
        typeof baseSchema,
        { val: string },
        typeof baseErrors
      >
    >()
  })

  it('use middleware with map input', () => {
    const mid = {} as Middleware<WELL_CONTEXT, { extra: boolean }, number, any, Record<never, never>>

    const i = decorated.use(mid, (input) => {
      expectTypeOf(input).toEqualTypeOf<{ val: number }>()
      return input.val
    })

    expectTypeOf(i).toEqualTypeOf<
      DecoratedProcedure<
        { auth: boolean },
        { db: string } & { extra: boolean },
        typeof baseSchema,
        typeof baseSchema,
        { val: string },
        typeof baseErrors
      >
    >()

    // @ts-expect-error - invalid input
    decorated.use(mid)

    // @ts-expect-error - invalid mapped input
    decorated.use(mid, input => input)
  })

  it('prevent conflict on context', () => {
    decorated.use(({ context, path, next }, input) => next({}))
    decorated.use(({ context, path, next }, input) => next({ context: { id: '1' } }))
    decorated.use(({ context, path, next }, input) => next({ context: { id: '1', extra: true } }))
    decorated.use(({ context, path, next }, input) => next({ context: { auth: true } }))

    decorated.use(({ context, path, next }, input) => next({}), () => 'anything')
    decorated.use(({ context, path, next }, input) => next({ context: { id: '1' } }), () => 'anything')
    decorated.use(({ context, path, next }, input) => next({ context: { id: '1', extra: true } }), () => 'anything')
    decorated.use(({ context, path, next }, input) => next({ context: { auth: true } }), () => 'anything')

    // @ts-expect-error - conflict with context
    decorated.use(({ context, path, next }, input) => next({ context: { auth: 1 } }))

    // @ts-expect-error - conflict with context
    decorated.use(({ context, path, next }, input) => next({ context: { auth: 1, extra: true } }))

    // @ts-expect-error - conflict with context
    decorated.use(({ context, path, next }, input) => next({ context: { auth: 1 } }), () => 'anything')

    // @ts-expect-error - conflict with context
    decorated.use(({ context, path, next }, input) => next({ context: { auth: 1, extra: true } }), () => 'anything')
  })

  it('handle middleware with output is typed', () => {
    const mid1 = {} as Middleware<WELL_CONTEXT, undefined, unknown, any, Record<never, never>>
    const mid2 = {} as Middleware<WELL_CONTEXT, undefined, unknown, { val: string }, Record<never, never>>
    const mid3 = {} as Middleware<WELL_CONTEXT, undefined, unknown, unknown, Record<never, never>>
    const mid4 = {} as Middleware<WELL_CONTEXT, undefined, unknown, { val: number }, Record<never, never>>

    decorated.use(mid1)
    decorated.use(mid2)

    // @ts-expect-error - required used any for output
    decorated.use(mid3)
    // @ts-expect-error - output is not match
    decorated.use(mid4)
  })

  it('unshiftTag', () => {
    expectTypeOf(decorated.unshiftTag('test')).toEqualTypeOf<typeof decorated>()
    expectTypeOf(decorated.unshiftTag('test', 'test2', 'test3')).toEqualTypeOf<typeof decorated>()

    // @ts-expect-error - invalid tag
    decorated.unshiftTag(1)
    // @ts-expect-error - invalid tag
    decorated.unshiftTag('123', 2)
  })

  it('unshiftMiddleware', () => {
    const mid1 = {} as Middleware<WELL_CONTEXT, undefined, unknown, any, Record<never, never>>
    const mid2 = {} as Middleware<{ auth: boolean }, undefined, unknown, any, Record<never, never>>
    const mid3 = {} as Middleware<{ auth: boolean }, { dev: boolean }, unknown, { val: number }, Record<never, never>>

    expectTypeOf(decorated.unshiftMiddleware(mid1)).toEqualTypeOf<typeof decorated>()
    expectTypeOf(decorated.unshiftMiddleware(mid1, mid2)).toEqualTypeOf<typeof decorated>()
    expectTypeOf(decorated.unshiftMiddleware(mid1, mid2, mid3)).toEqualTypeOf<typeof decorated>()

    const mid4 = {} as Middleware<{ auth: 'invalid' }, undefined, unknown, any, Record<never, never>>
    const mid5 = {} as Middleware<{ auth: boolean }, undefined, { val: number }, any, Record<never, never>>
    const mid7 = {} as Middleware<{ db: string }, undefined, unknown, { val: number }, Record<never, never>>
    const mid8 = {} as Middleware<WELL_CONTEXT, { auth: string }, unknown, { val: number }, Record<never, never>>

    // @ts-expect-error - context is not match
    decorated.unshiftMiddleware(mid4)
    // @ts-expect-error - input is not match
    decorated.unshiftMiddleware(mid5)
    // @ts-expect-error - context is not match
    decorated.unshiftMiddleware(mid7)
    // @ts-expect-error - extra context is conflict with context
    decorated.unshiftMiddleware(mid8)
    // @ts-expect-error - invalid middleware
    decorated.unshiftMiddleware(mid4, mid5, mid7, mid8)

    const mid9 = {} as Middleware<WELL_CONTEXT, { something_does_not_exists_yet: boolean }, unknown, any, Record<never, never>>
    const mid10 = {} as Middleware<WELL_CONTEXT, { something_does_not_exists_yet: string }, { val: number }, any, Record<never, never>>

    decorated.unshiftMiddleware(mid9)
    // @ts-expect-error - extra context of mid10 is conflict with extra context of mid9
    decorated.unshiftMiddleware(mid9, mid10)

    // @ts-expect-error - invalid middleware
    decorated.unshiftMiddleware(1)
    // @ts-expect-error - invalid middleware
    decorated.unshiftMiddleware(() => { }, 1)
  })

  it('callable', () => {
    const callable = decorated.callable({
      context: async (clientContext: 'something') => ({ auth: true }),
    })

    expectTypeOf(callable).toEqualTypeOf<
      & DecoratedProcedure<{ auth: boolean }, { db: string }, typeof baseSchema, typeof baseSchema, { val: string }, typeof baseErrors>
      & Client<'something', { val: string }, { val: number }, Error | ORPCError<'CODE', { why: string }>>
    >()
  })

  it('actionable', () => {
    const actionable = decorated.actionable({
      context: async (clientContext: 'something') => ({ auth: true }),
    })

    expectTypeOf(actionable).toEqualTypeOf<
      & DecoratedProcedure<{ auth: boolean }, { db: string }, typeof baseSchema, typeof baseSchema, { val: string }, typeof baseErrors>
      & ((...rest: ClientRest<'something', { val: string }>) => Promise<{ val: number }>)
    >()
  })
})
