import type { Route } from '@orpc/contract'
import type { Builder } from './builder'
import type { BuilderWithErrors } from './builder-with-errors'
import type { BuilderWithMiddlewares } from './builder-with-middlewares'
import type { Context } from './context'
import type { ChainableImplementer } from './implementer-chainable'
import type { Lazy } from './lazy'
import type { DecoratedLazy } from './lazy-decorated'
import type { MiddlewareOutputFn } from './middleware'
import type { DecoratedMiddleware } from './middleware-decorated'
import type { ANY_PROCEDURE, Procedure } from './procedure'
import type { ProcedureBuilder } from './procedure-builder'
import type { ProcedureBuilderWithInput } from './procedure-builder-with-input'
import type { ProcedureBuilderWithOutput } from './procedure-builder-with-output'
import type { DecoratedProcedure } from './procedure-decorated'
import type { RouterBuilder } from './router-builder'
import { oc } from '@orpc/contract'
import { z } from 'zod'

const schema = z.object({ val: z.string().transform(v => Number.parseInt(v)) })

const errors = {
  CODE: {
    status: 404,
    data: z.object({ why: z.string() }),
  },
}

const builder = {} as Builder<{ db: string }>

describe('Builder', () => {
  it('.context', () => {
    expectTypeOf(builder.context()).toEqualTypeOf<Builder<{ db: string }>>()
    expectTypeOf(builder.context<{ db: string, anything: string }>()).toEqualTypeOf<Builder<{ db: string, anything: string }>>()

    // @ts-expect-error - new context must satisfy old context
    builder.context<{ anything: string }>()
  })

  it('.config', () => {
    expectTypeOf(builder.config({ initialRoute: { method: 'GET' } })).toEqualTypeOf<Builder<{ db: string }>>()

    // @ts-expect-error - invalid method
    builder.config({ initialRoute: { method: 'HE' } })
  })

  it('.middleware', () => {
    const mid = builder.middleware(({ context, next, path, procedure, errors }, input, output) => {
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<{ db: string }>()
      expectTypeOf(path).toEqualTypeOf<string[]>()
      expectTypeOf(procedure).toEqualTypeOf<ANY_PROCEDURE>()
      expectTypeOf(output).toEqualTypeOf<MiddlewareOutputFn<any>>()
      expectTypeOf(errors).toEqualTypeOf<Record<never, never>>()

      return next({
        context: {
          extra: true,
        },
      })
    })

    expectTypeOf(mid).toEqualTypeOf<
      DecoratedMiddleware<{ db: string }, { extra: boolean }, unknown, any, Record<never, never>>
    >()

    const mid2 = builder.middleware(({ next }, input: 'input', output: MiddlewareOutputFn<'output'>) => next({}))

    expectTypeOf(mid2).toEqualTypeOf<
      DecoratedMiddleware<{ db: string }, Record<never, never>, 'input', 'output', Record<never, never>>
    >()

    // @ts-expect-error --- conflict context
    builder.middleware(({ next }) => next({ db: 123 }))
  })

  it('.errors', () => {
    expectTypeOf(builder.errors(errors)).toEqualTypeOf<BuilderWithErrors<{ db: string }, typeof errors>>()
  })

  it('.use', () => {
    const applied = builder.use(({ context, next, path, procedure, errors }, input, output) => {
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<{ db: string }>()
      expectTypeOf(path).toEqualTypeOf<string[]>()
      expectTypeOf(procedure).toEqualTypeOf<ANY_PROCEDURE>()
      expectTypeOf(output).toEqualTypeOf<MiddlewareOutputFn<unknown>>()
      expectTypeOf(errors).toEqualTypeOf<Record<never, never>>()

      return next({
        context: {
          extra: true,
        },
      })
    })

    expectTypeOf(applied).toEqualTypeOf<BuilderWithMiddlewares < { db: string }, { db: string } & { extra: boolean }>>()

    // @ts-expect-error --- conflict context
    builder.use(({ next }) => next({ context: { db: 123 } }))
    // conflict but not detected
    expectTypeOf(builder.use(({ next }) => next({ context: { db: undefined } }))).toMatchTypeOf<never>()
    // @ts-expect-error --- input is not match
    builder.use(({ next }, input: 'invalid') => next({}))
    // @ts-expect-error --- output is not match
    builder.use(({ next }, input, output: MiddlewareOutputFn<'invalid'>) => next({}))
  })

  it('.route', () => {
    expectTypeOf(builder.route({ path: '/test', method: 'GET' })).toEqualTypeOf<
      ProcedureBuilder<{ db: string }, { db: string }, Record<never, never>>
    >()
  })

  it('.input', () => {
    expectTypeOf(builder.input(schema)).toEqualTypeOf<
      ProcedureBuilderWithInput<{ db: string }, { db: string }, typeof schema, Record<never, never>>
    >()
  })

  it('.output', () => {
    expectTypeOf(builder.output(schema)).toEqualTypeOf<
      ProcedureBuilderWithOutput<{ db: string }, { db: string }, typeof schema, Record<never, never>>
    >()
  })

  it('.handler', () => {
    const procedure = builder.handler(({ input, context, procedure, path, signal, errors }) => {
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<{ db: string }>()
      expectTypeOf(procedure).toEqualTypeOf<ANY_PROCEDURE>()
      expectTypeOf(path).toEqualTypeOf<string[]>()
      expectTypeOf(signal).toEqualTypeOf<undefined | InstanceType<typeof AbortSignal>>()
      expectTypeOf(errors).toEqualTypeOf<Record<never, never>>()

      return 456
    })

    expectTypeOf(procedure).toMatchTypeOf<
      DecoratedProcedure<{ db: string }, { db: string }, undefined, undefined, number, Record<never, never>, Route>
    >()
  })

  it('.prefix', () => {
    expectTypeOf(builder.prefix('/test')).toEqualTypeOf<
      RouterBuilder<{ db: string }, { db: string }, Record<never, never>>
    >()
  })

  it('.tag', () => {
    expectTypeOf(builder.tag('test', 'test2')).toEqualTypeOf<
      RouterBuilder<{ db: string }, { db: string }, Record<never, never>>
    >()
  })

  it('.router', () => {
    const router = {
      ping: {} as Procedure<{ db: string }, { db: string }, undefined, undefined, unknown, typeof errors, Route>,
      pong: {} as Procedure<Context, Context, undefined, undefined, unknown, Record<never, never>, Route>,
    }

    expectTypeOf(builder.router(router)).toEqualTypeOf<
      typeof router
    >()

    builder.router({
      // @ts-expect-error - context is not match
      ping: {} as Procedure<{ auth: 'invalid' }, undefined, undefined, undefined, unknown, typeof errors>,
    })
  })

  it('.lazy', () => {
    const router = {
      ping: {} as Procedure<{ db: string }, { db: string }, undefined, undefined, unknown, typeof errors, Route>,
      pong: {} as Procedure<Context, Context, undefined, undefined, unknown, Record<never, never>, Route>,
    }

    expectTypeOf(builder.lazy(() => Promise.resolve({ default: router }))).toEqualTypeOf<
      DecoratedLazy<Lazy<typeof router>>
    >()

    // @ts-expect-error - context is not match
    builder.lazy(() => Promise.resolve({ default: {
      ping: {} as Procedure<{ auth: 'invalid' }, Context, undefined, undefined, unknown, typeof errors, Route>,
    } }))
  })

  it('.contract', () => {
    const contract = oc.router({
      ping: oc.input(schema).output(schema),
    })

    expectTypeOf(builder.contract(contract)).toEqualTypeOf<
      ChainableImplementer<{ db: string }, { db: string }, typeof contract>
    >()
  })
})
