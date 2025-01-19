import type { Context } from './context'
import type { Lazy } from './lazy'
import type { DecoratedLazy } from './lazy-decorated'
import type { Middleware, MiddlewareOutputFn } from './middleware'
import type { ANY_PROCEDURE, Procedure } from './procedure'
import type { DecoratedProcedure } from './procedure-decorated'
import type { AdaptedRouter, RouterBuilder } from './router-builder'
import { z } from 'zod'
import { lazy } from './lazy'

const baseErrors = {
  BASE: {
    data: z.object({ why: z.string() }),
  },
}

const builder = {} as RouterBuilder<{ auth: boolean }, { auth: boolean } & { db: string }, typeof baseErrors>

describe('AdaptedRouter', () => {
  const ping = {} as Procedure<{ auth: boolean }, { auth: boolean } & { db: string }, undefined, undefined, unknown, typeof baseErrors>
  const pong = {} as Procedure<Context, Context, undefined, undefined, unknown, Record<never, never>>

  it('without lazy', () => {
    const router = {
      ping,
      pong,
      nested: {
        ping,
        pong,
      },
    }
    const adapted = {} as AdaptedRouter<{ log: true, auth: boolean }, typeof router, typeof baseErrors>

    expectTypeOf(adapted.ping).toEqualTypeOf<
      DecoratedProcedure<{ log: true, auth: boolean }, { auth: boolean } & { db: string }, undefined, undefined, unknown, typeof baseErrors>
    >()
    expectTypeOf(adapted.pong).toEqualTypeOf<
      DecoratedProcedure<{ log: true, auth: boolean }, Context, undefined, undefined, unknown, Record<never, never> & typeof baseErrors>
    >()
    expectTypeOf(adapted.nested.ping).toEqualTypeOf<
      DecoratedProcedure<{ log: true, auth: boolean }, { auth: boolean } & { db: string }, undefined, undefined, unknown, typeof baseErrors>
    >()
    expectTypeOf(adapted.nested.pong).toEqualTypeOf<
      DecoratedProcedure<{ log: true, auth: boolean }, Context, undefined, undefined, unknown, Record<never, never> & typeof baseErrors>
    >()
  })

  it('with lazy', () => {
    const router = {
      ping: lazy(() => Promise.resolve({ default: ping })),
      pong,
      nested: lazy(() => Promise.resolve({
        default: {
          ping,
          pong: lazy(() => Promise.resolve({ default: pong })),
        },
      })),
    }

    const adapted = {} as AdaptedRouter<{ log: true }, typeof router, typeof baseErrors>

    expectTypeOf(adapted.ping).toEqualTypeOf<DecoratedLazy<
      DecoratedProcedure<{ log: true }, { auth: boolean } & { db: string }, undefined, undefined, unknown, typeof baseErrors>
    >>()
    expectTypeOf(adapted.pong).toEqualTypeOf<
      DecoratedProcedure<{ log: true }, Context, undefined, undefined, unknown, Record<never, never> & typeof baseErrors>
    >()
    expectTypeOf(adapted.nested.ping).toEqualTypeOf<DecoratedLazy<
      DecoratedProcedure<{ log: true }, { auth: boolean } & { db: string }, undefined, undefined, unknown, typeof baseErrors>
    >>()
    expectTypeOf(adapted.nested.pong).toEqualTypeOf<DecoratedLazy<
      DecoratedProcedure<{ log: true }, Context, undefined, undefined, unknown, Record<never, never> & typeof baseErrors>
    >>()
  })

  it('with procedure', () => {
    expectTypeOf<AdaptedRouter<{ log: boolean }, typeof ping, typeof baseErrors>>().toEqualTypeOf<
      DecoratedProcedure<{ log: boolean }, { auth: boolean } & { db: string }, undefined, undefined, unknown, typeof baseErrors>
    >()

    expectTypeOf<AdaptedRouter<{ log: boolean }, Lazy<typeof ping>, typeof baseErrors>>().toEqualTypeOf<
      DecoratedLazy<DecoratedProcedure<{ log: boolean }, { auth: boolean } & { db: string }, undefined, undefined, unknown, typeof baseErrors>>
    >()
  })
})

describe('self chainable', () => {
  it('prefix', () => {
    expectTypeOf(builder.prefix('/test')).toEqualTypeOf<typeof builder>()

    // @ts-expect-error - invalid prefix
    builder.prefix('')
    // @ts-expect-error - invalid prefix
    builder.prefix(1)
  })

  it('tag', () => {
    expectTypeOf(builder.tag('test')).toEqualTypeOf<typeof builder>()
    expectTypeOf(builder.tag('test', 'test2', 'test3')).toEqualTypeOf<typeof builder>()

    // @ts-expect-error - invalid tag
    builder.tag(1)
    // @ts-expect-error - invalid tag
    builder.tag('123', 2)
  })

  it('use middleware', () => {
    builder.use(({ next, context, path, procedure, signal, errors }, input, output) => {
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<{ auth: boolean } & { db: string }>()
      expectTypeOf(path).toEqualTypeOf<string[]>()
      expectTypeOf(procedure).toEqualTypeOf<ANY_PROCEDURE>()
      expectTypeOf(output).toEqualTypeOf<MiddlewareOutputFn<unknown>>()
      expectTypeOf(signal).toEqualTypeOf<undefined | InstanceType<typeof AbortSignal>>()
      expectTypeOf(errors).toEqualTypeOf<Record<never, never>>()

      return next({})
    })

    const mid1 = {} as Middleware<{ auth: boolean }, Record<never, never>, unknown, unknown, Record<never, never>>
    const mid2 = {} as Middleware<{ auth: boolean }, { dev: string }, unknown, unknown, Record<never, never>>
    const mid3 = {} as Middleware<{ auth: boolean, db: string }, { dev: string }, unknown, unknown, Record<never, never>>

    expectTypeOf(builder.use(mid1)).toEqualTypeOf<
      RouterBuilder<{ auth: boolean }, { auth: boolean } & { db: string } & Record<never, never>, typeof baseErrors>
    >()
    expectTypeOf(builder.use(mid2)).toEqualTypeOf<
      RouterBuilder<{ auth: boolean }, { auth: boolean } & { db: string } & { dev: string }, typeof baseErrors>
    >()
    expectTypeOf(builder.use(mid3)).toEqualTypeOf<
      RouterBuilder < { auth: boolean }, { auth: boolean } & { db: string } & { dev: string }, typeof baseErrors>
    >()

    const mid4 = {} as Middleware<{ auth: boolean }, { dev: string }, unknown, { val: string }, Record<never, never>>
    const mid5 = {} as Middleware<{ auth: boolean }, { dev: string }, unknown, { val: number }, Record<never, never>>
    const mid6 = {} as Middleware<{ auth: 'invalid' }, Context, any, unknown, Record<never, never>>

    // @ts-expect-error - invalid middleware
    builder.use(mid4)
    // @ts-expect-error - invalid middleware
    builder.use(mid5)
    // @ts-expect-error - invalid middleware
    builder.use(mid6)
    // @ts-expect-error - invalid middleware
    builder.use(true)
    // @ts-expect-error - invalid middleware
    builder.use(() => {})

    // conflict context but not detected
    expectTypeOf(builder.use(({ next }) => next({ context: { auth: undefined } }))).toEqualTypeOf<never>()
  })

  it('errors', () => {
    const errors = {
      WRONG: {
        data: z.object({ why: z.string() }),
      },
    }

    const applied = builder.errors(errors)

    expectTypeOf(applied).toEqualTypeOf<
      RouterBuilder < { auth: boolean }, { auth: boolean } & { db: string }, typeof errors & typeof baseErrors>
    >()

    // @ts-expect-error - not allow redefine errors
    builder.errors({ BASE: baseErrors.BASE })
    // @ts-expect-error - not allow redefine errors --- even with undefined
    builder.errors({ BASE: undefined })
  })
})

describe('to AdaptedRouter', () => {
  const schema = z.object({ val: z.string().transform(v => Number.parseInt(v)) })
  const ping = {} as Procedure<{ auth: boolean }, { db: string }, typeof schema, typeof schema, { val: string }, typeof baseErrors>
  const pong = {} as Procedure<Context, Context, undefined, undefined, unknown, Record<never, never>>

  const wrongPing = {} as Procedure<{ auth: 'invalid' }, Context, undefined, undefined, unknown, Record<never, never>>

  it('router without lazy', () => {
    const router = { ping, pong, nested: { ping, pong } }
    expectTypeOf(builder.router(router)).toEqualTypeOf <AdaptedRouter<{ auth: boolean }, typeof router, typeof baseErrors>>()
  })

  it('router with lazy', () => {
    const router = {
      ping: lazy(() => Promise.resolve({ default: ping })),
      pong,
      nested: lazy(() => Promise.resolve({
        default: {
          ping,
          pong: lazy(() => Promise.resolve({ default: pong })),
        },
      })),
    }

    expectTypeOf(builder.router(router)).toEqualTypeOf<
      AdaptedRouter<
        { auth: boolean },
        typeof router,
        typeof baseErrors
      >
    >()

    builder.router({ ping: lazy(() => Promise.resolve({ default: ping })) })
    // @ts-expect-error - context is not match
    builder.router({ wrongPing: lazy(() => Promise.resolve({ default: wrongPing })) })
  })

  it('procedure as a router', () => {
    expectTypeOf(builder.router(ping)).toEqualTypeOf<
      AdaptedRouter<
        { auth: boolean },
        typeof ping,
        typeof baseErrors
      >
    >()

    expectTypeOf(builder.router(lazy(() => Promise.resolve({ default: ping })))).toEqualTypeOf<
      AdaptedRouter<
        { auth: boolean },
        Lazy<typeof ping>,
        typeof baseErrors
      >
    >()
  })
})

describe('to Decorated Adapted Lazy', () => {
  const schema = z.object({ val: z.string().transform(v => Number.parseInt(v)) })
  const ping = {} as Procedure<{ auth: boolean }, { db: string }, typeof schema, typeof schema, { val: string }, typeof baseErrors>
  const pong = {} as Procedure<Context, Context, undefined, undefined, unknown, Record<never, never>>

  const wrongPing = {} as Procedure<{ auth: 'invalid' }, Context, undefined, undefined, unknown, Record<never, never>>

  it('router without lazy', () => {
    const router = {
      ping,
      pong,
      nested: {
        ping,
        pong,
      },
    }

    expectTypeOf(builder.lazy(() => Promise.resolve({ default: router }))).toEqualTypeOf<
      DecoratedLazy<AdaptedRouter<{ auth: boolean }, typeof router, typeof baseErrors>>
    >()

    builder.lazy(() => Promise.resolve({ default: { ping } }))
    // @ts-expect-error - context is not match
    builder.lazy(() => Promise.resolve({ default: { wrongPing } }))
  })

  it('router with lazy', () => {
    const router = {
      ping: lazy(() => Promise.resolve({ default: ping })),
      pong,
      nested: lazy(() => Promise.resolve({
        default: {
          ping,
          pong: lazy(() => Promise.resolve({ default: pong })),
        },
      })),
    }

    expectTypeOf(builder.lazy(() => Promise.resolve({ default: router }))).toEqualTypeOf<
      DecoratedLazy<AdaptedRouter<{ auth: boolean }, typeof router, typeof baseErrors>>
    >()

    builder.lazy(() => Promise.resolve({ default: { ping: lazy(() => Promise.resolve({ default: ping })) } }))
    // @ts-expect-error - context is not match
    builder.lazy(() => Promise.resolve({ default: { wrongPing: lazy(() => Promise.resolve({ default: wrongPing })) } }))
  })
})
