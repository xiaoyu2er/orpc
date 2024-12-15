import type { Middleware, MiddlewareMeta } from './middleware'
import type { Procedure } from './procedure'
import type { DecoratedProcedure } from './procedure-decorated'
import type { WELL_CONTEXT } from './types'
import { z } from 'zod'
import { decorateProcedure } from './procedure-decorated'

const schema = z.object({ val: z.string().transform(v => Number.parseInt(v)) })
const procedure = {} as Procedure<{ auth: boolean }, { db: string }, typeof schema, typeof schema, { val: string }>

const decorated = decorateProcedure(procedure)

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
      .use((input, context, meta) => {
        expectTypeOf(input).toEqualTypeOf<{ val: number }>()
        expectTypeOf(context).toEqualTypeOf<{ auth: boolean } & { db: string }>()
        expectTypeOf(meta).toEqualTypeOf<MiddlewareMeta<{ val: string }>>()

        return meta.next({
          context: {
            dev: true,
          },
        })
      })
      .use((input, context, meta) => {
        expectTypeOf(input).toEqualTypeOf<{ val: number }>()
        expectTypeOf(context).toEqualTypeOf<{ auth: boolean } & { db: string } & { dev: boolean }>()
        expectTypeOf(meta).toEqualTypeOf<MiddlewareMeta<{ val: string }>>()

        return meta.next({})
      })

    expectTypeOf(i).toEqualTypeOf<
      DecoratedProcedure<
        { auth: boolean },
        { db: string } & { dev: boolean },
        typeof schema,
        typeof schema,
        { val: string }
      >
    >()
  })

  it('use middleware with map input', () => {
    const mid = {} as Middleware<WELL_CONTEXT, { extra: boolean }, number, any>

    const i = decorated.use(mid, (input) => {
      expectTypeOf(input).toEqualTypeOf<{ val: number }>()
      return input.val
    })

    expectTypeOf(i).toEqualTypeOf<
      DecoratedProcedure<
        { auth: boolean },
        { db: string } & { extra: boolean },
        typeof schema,
        typeof schema,
        { val: string }
      >
    >()

    // @ts-expect-error - invalid input
    decorated.use(mid)

    // @ts-expect-error - invalid mapped input
    decorated.use(mid, input => input)
  })

  it('prevent conflict on context', () => {
    decorated.use((input, context, meta) => meta.next({}))
    decorated.use((input, context, meta) => meta.next({ context: { id: '1' } }))
    decorated.use((input, context, meta) => meta.next({ context: { id: '1', extra: true } }))
    decorated.use((input, context, meta) => meta.next({ context: { auth: true } }))

    decorated.use((input, context, meta) => meta.next({}), () => 'anything')
    decorated.use((input, context, meta) => meta.next({ context: { id: '1' } }), () => 'anything')
    decorated.use((input, context, meta) => meta.next({ context: { id: '1', extra: true } }), () => 'anything')
    decorated.use((input, context, meta) => meta.next({ context: { auth: true } }), () => 'anything')

    // @ts-expect-error - conflict with context
    decorated.use((input, context, meta) => meta.next({ context: { auth: 1 } }))

    // @ts-expect-error - conflict with context
    decorated.use((input, context, meta) => meta.next({ context: { auth: 1, extra: true } }))

    // @ts-expect-error - conflict with context
    decorated.use((input, context, meta) => meta.next({ context: { auth: 1 } }), () => 'anything')

    // @ts-expect-error - conflict with context
    decorated.use((input, context, meta) => meta.next({ context: { auth: 1, extra: true } }), () => 'anything')
  })

  it('handle middleware with output is typed', () => {
    const mid1 = {} as Middleware<WELL_CONTEXT, undefined, unknown, any>
    const mid2 = {} as Middleware<WELL_CONTEXT, undefined, unknown, { val: string }>
    const mid3 = {} as Middleware<WELL_CONTEXT, undefined, unknown, unknown>
    const mid4 = {} as Middleware<WELL_CONTEXT, undefined, unknown, { val: number }>

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
    const mid1 = {} as Middleware<WELL_CONTEXT, undefined, unknown, any>
    const mid2 = {} as Middleware<{ auth: boolean }, undefined, { val: number }, any>
    const mid3 = {} as Middleware<{ auth: boolean }, { dev: boolean }, unknown, { val: string }>

    expectTypeOf(decorated.unshiftMiddleware(mid1)).toEqualTypeOf<typeof decorated>()
    expectTypeOf(decorated.unshiftMiddleware(mid1, mid2)).toEqualTypeOf<typeof decorated>()
    expectTypeOf(decorated.unshiftMiddleware(mid1, mid2, mid3)).toEqualTypeOf<
      DecoratedProcedure<{ auth: boolean }, { dev: boolean } & { db: string }, typeof schema, typeof schema, { val: string }>
    >()

    const mid4 = {} as Middleware<{ auth: 'invalid' }, undefined, unknown, any>
    const mid5 = {} as Middleware<{ auth: boolean }, undefined, { val: string }, any>
    const mid6 = {} as Middleware<WELL_CONTEXT, undefined, unknown, { val: number }>
    const mid7 = {} as Middleware<{ db: string }, undefined, unknown, { val: string }>

    // @ts-expect-error - invalid middleware
    decorated.unshiftMiddleware(mid4)
    // @ts-expect-error - invalid middleware
    decorated.unshiftMiddleware(mid5)
    // @ts-expect-error - invalid middleware
    decorated.unshiftMiddleware(mid6)
    // @ts-expect-error - invalid middleware
    decorated.unshiftMiddleware(mid7)
    // @ts-expect-error - invalid middleware
    decorated.unshiftMiddleware(mid4, mid5, mid6, mid7)

    // @ts-expect-error - invalid middleware
    decorated.unshiftMiddleware(1)
    // @ts-expect-error - invalid middleware
    decorated.unshiftMiddleware(() => { }, 1)
  })
})
