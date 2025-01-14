import type { Builder } from './builder'
import type { ChainableImplementer } from './implementer-chainable'
import type { DecoratedLazy } from './lazy-decorated'
import type { Middleware, MiddlewareOutputFn } from './middleware'
import type { DecoratedMiddleware } from './middleware-decorated'
import type { ANY_PROCEDURE, Procedure } from './procedure'
import type { ProcedureBuilder } from './procedure-builder'
import type { DecoratedProcedure } from './procedure-decorated'
import type { AdaptedRouter, RouterBuilder } from './router-builder'
import type { WELL_CONTEXT } from './types'
import { oc } from '@orpc/contract'
import { z } from 'zod'

const schema = z.object({ val: z.string().transform(v => Number.parseInt(v)) })

const baseErrors = {
  BASE: {
    status: 500,
    data: z.object({
      message: z.string(),
    }),
  },
}

const builder = {} as Builder<{ auth: boolean }, { db: string }, typeof baseErrors>

describe('self chainable', () => {
  it('define context', () => {
    expectTypeOf(builder.context()).toEqualTypeOf<Builder<WELL_CONTEXT, undefined, Record<never, never>>>()
    expectTypeOf(builder.context<{ db: string }>()).toEqualTypeOf<Builder<{ db: string }, undefined, Record<never, never>>>()
    expectTypeOf(builder.context<{ auth: boolean }>()).toEqualTypeOf<Builder<{ auth: boolean }, undefined, Record<never, never>>>()
  })

  it('use middleware', () => {
    expectTypeOf(
      builder.use({} as Middleware<{ auth: boolean }, undefined, unknown, unknown, Record<never, never>>),
    ).toEqualTypeOf<Builder<{ auth: boolean }, { db: string }, typeof baseErrors>>()
    expectTypeOf(
      builder.use({} as Middleware<{ auth: boolean }, { dev: string }, unknown, unknown, Record<never, never>>),
    ).toEqualTypeOf<Builder<{ auth: boolean }, { db: string } & { dev: string }, typeof baseErrors>>()
    expectTypeOf(
      builder.use({} as Middleware<WELL_CONTEXT, undefined, unknown, unknown, Record<never, never>>),
    ).toEqualTypeOf<Builder<{ auth: boolean }, { db: string }, typeof baseErrors>>()

    // @ts-expect-error - context is not match
    builder.use({} as Middleware<{ auth: 'invalid' }, undefined, unknown, unknown, Record<never, never>>)

    // @ts-expect-error - extra context is conflict with context
    builder.use({} as Middleware<WELL_CONTEXT, { auth: 'invalid' }, unknown, unknown, Record<never, never>>)

    // @ts-expect-error - expected input is not match with unknown
    builder.use({} as Middleware<WELL_CONTEXT, undefined, number, unknown, Record<never, never>>)

    // @ts-expect-error - expected output is not match with unknown
    builder.use({} as Middleware<WELL_CONTEXT, undefined, unknown, number, Record<never, never>>)

    // @ts-expect-error - invalid middleware
    builder.use(() => {})
  })

  it('errors', () => {
    expectTypeOf(builder.errors({ ANYTHING: { data: schema } })).toEqualTypeOf<
      Builder<{ auth: boolean }, { db: string }, { ANYTHING: { data: typeof schema } } & typeof baseErrors>
    >()

    // @ts-expect-error - not allow redefine errorMap
    builder.errors({ BASE: baseErrors.BASE })
    // @ts-expect-error - not allow redefine errorMap --- even with undefined
    builder.errors({ BASE: undefined })
    // @ts-expect-error - invalid schema
    builder.errors({ ANYTHING: { data: {} } })
  })
})

describe('create middleware', () => {
  it('works', () => {
    const mid = builder.middleware(({ context, next, path, procedure }, input, output) => {
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<{ auth: boolean } & { db: string }>()
      expectTypeOf(path).toEqualTypeOf<string[]>()
      expectTypeOf(procedure).toEqualTypeOf<ANY_PROCEDURE>()
      expectTypeOf(output).toEqualTypeOf<MiddlewareOutputFn<any>>()

      return next({
        context: {
          dev: true,
        },
      })
    })

    expectTypeOf(mid).toEqualTypeOf<
      DecoratedMiddleware<{ auth: boolean } & { db: string }, { dev: boolean }, unknown, any, Record<never, never>>
    >()

    // @ts-expect-error - conflict extra context and context
    builder.middleware(({ context, next, path }, input) => next({
      context: {
        auth: 'invalid',
      },
    }))
  })
})

describe('to ProcedureBuilder', () => {
  it('route', () => {
    expectTypeOf(builder.route({ path: '/test', method: 'GET' })).toEqualTypeOf<
      ProcedureBuilder<{ auth: boolean }, { db: string }, undefined, undefined, typeof baseErrors>
    >()

    // @ts-expect-error - invalid path
    builder.route({ path: '' })

    // @ts-expect-error - invalid method
    builder.route({ method: '' })
  })

  it('input', () => {
    expectTypeOf(builder.input(schema, { val: '123' })).toEqualTypeOf<
      ProcedureBuilder<{ auth: boolean }, { db: string }, typeof schema, undefined, typeof baseErrors>
    >()

    builder.input(schema)
    // @ts-expect-error - invalid example
    builder.input(schema, { val: 123 })
    // @ts-expect-error - invalid schema
    builder.input({})
  })

  it('output', () => {
    expectTypeOf(builder.output(schema, { val: 123 })).toEqualTypeOf<
      ProcedureBuilder<{ auth: boolean }, { db: string }, undefined, typeof schema, typeof baseErrors>
    >()

    builder.output(schema)
    // @ts-expect-error - invalid example
    builder.output(schema, { val: '123' })
    // @ts-expect-error - invalid schema
    builder.output({})
  })
})

describe('to DecoratedProcedure', () => {
  it('handler', () => {
    expectTypeOf(builder.handler(({ input, context, procedure, path, signal }) => {
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<{ auth: boolean } & { db: string }>()
      expectTypeOf(procedure).toEqualTypeOf<ANY_PROCEDURE>()
      expectTypeOf(path).toEqualTypeOf<string[]>()
      expectTypeOf(signal).toEqualTypeOf<undefined | InstanceType<typeof AbortSignal>>()

      return 456
    })).toMatchTypeOf<
      DecoratedProcedure<{ auth: boolean }, { db: string }, undefined, undefined, number, Record<never, never>>
    >()
  })
})

describe('to RouterBuilder', () => {
  it('prefix', () => {
    expectTypeOf(builder.prefix('/test')).toEqualTypeOf<
      RouterBuilder<{ auth: boolean }, { db: string }>
    >()

    // @ts-expect-error invalid prefix
    builder.prefix('')
  })

  it('tags', () => {
    expectTypeOf(builder.tag('test', 'test2')).toEqualTypeOf<
      RouterBuilder<{ auth: boolean }, { db: string }>
    >()

    // @ts-expect-error invalid tags
    builder.tag(123)
  })
})

it('to AdaptedRouter', () => {
  const ping = {} as Procedure<{ auth: boolean, db: string }, undefined, undefined, undefined, unknown, Record<never, never>>
  const router = {
    ping,
    nested: {
      ping,
    },
  }
  expectTypeOf(builder.router(router)).toEqualTypeOf<
    AdaptedRouter<{ auth: boolean }, typeof router>
  >()

  // @ts-expect-error - context is not match
  builder.router({ ping: {} as Procedure<{ invalid: true }, undefined, undefined, undefined, unknown> })
})

it('to DecoratedLazy', () => {
  const ping = {} as Procedure<{ auth: boolean, db: string }, undefined, undefined, undefined, unknown, Record<never, never>>
  const router = {
    ping,
    nested: {
      ping,
    },
  }

  expectTypeOf(
    builder.lazy(() => Promise.resolve({ default: router })),
  ).toEqualTypeOf<
    DecoratedLazy<AdaptedRouter<{ auth: boolean }, typeof router>>
  >()

  // @ts-expect-error - context is not match
  builder.lazy(() => Promise.resolve({ default: {
    ping: {} as Procedure<{ invalid: true }, undefined, undefined, undefined, unknown, Record<never, never>>,
  } }))
})

it('to ChainableImplementer', () => {
  const schema = z.object({ val: z.string().transform(val => Number(val)) })

  const ping = oc.input(schema).output(schema)
  const pong = oc.route({ method: 'GET', path: '/ping' })

  const contract = oc.router({
    ping,
    pong,
    nested: {
      ping,
      pong,
    },
  })

  expectTypeOf(builder.contract(contract)).toEqualTypeOf<
    ChainableImplementer<{ auth: boolean }, { db: string }, typeof contract>
  >()

  /// @ts-expect-error - context is not match
  builder.contract({} as ANY_PROCEDURE)
})
