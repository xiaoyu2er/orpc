import type { Route } from '@orpc/contract'
import type { BuilderWithErrorsMiddlewares } from './builder-with-errors-middlewares'
import type { BuilderWithMiddlewares } from './builder-with-middlewares'
import type { Context } from './context'
import type { ChainableImplementer } from './implementer-chainable'
import type { Lazy } from './lazy'
import type { MiddlewareOutputFn } from './middleware'
import type { ANY_PROCEDURE, Procedure } from './procedure'
import type { ProcedureBuilder } from './procedure-builder'
import type { ProcedureBuilderWithInput } from './procedure-builder-with-input'
import type { ProcedureBuilderWithOutput } from './procedure-builder-with-output'
import type { DecoratedProcedure } from './procedure-decorated'
import type { AdaptedRouter, RouterBuilder } from './router-builder'
import { oc } from '@orpc/contract'
import { z } from 'zod'

const schema = z.object({ val: z.string().transform(v => Number.parseInt(v)) })

const errors = {
  CODE: {
    status: 404,
    data: z.object({ why: z.string() }),
  },
}

const builder = {} as BuilderWithMiddlewares<{ db: string }, { db: string, auth?: boolean }>

describe('BuilderWithMiddlewares', () => {
  it('.use', () => {
    const applied = builder.use(({ context, next, path, procedure, errors }, input, output) => {
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<{ db: string, auth?: boolean }>()
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

    expectTypeOf(applied).toEqualTypeOf<BuilderWithMiddlewares < { db: string }, { db: string, auth?: boolean } & { extra: boolean }>>()

    // @ts-expect-error --- conflict context
    builder.use(({ next }) => next({ context: { db: 123 } }))
    // conflict but not detected
    expectTypeOf(builder.use(({ next }) => next({ context: { db: undefined } }))).toMatchTypeOf<never>()
    // @ts-expect-error --- input is not match
    builder.use(({ next }, input: 'invalid') => next({}))
    // @ts-expect-error --- output is not match
    builder.use(({ next }, input, output: MiddlewareOutputFn<'invalid'>) => next({}))
  })

  it('.errors', () => {
    expectTypeOf(builder.errors(errors)).toEqualTypeOf<BuilderWithErrorsMiddlewares<{ db: string }, { db: string, auth?: boolean }, typeof errors>>()
  })

  it('.route', () => {
    expectTypeOf(builder.route({ path: '/test', method: 'GET' })).toEqualTypeOf<
      ProcedureBuilder<{ db: string }, { db: string, auth?: boolean }, Record<never, never>>
    >()
  })

  it('.input', () => {
    expectTypeOf(builder.input(schema)).toEqualTypeOf<
      ProcedureBuilderWithInput<{ db: string }, { db: string, auth?: boolean }, typeof schema, Record<never, never>>
    >()
  })

  it('.output', () => {
    expectTypeOf(builder.output(schema)).toEqualTypeOf<
      ProcedureBuilderWithOutput<{ db: string }, { db: string, auth?: boolean }, typeof schema, Record<never, never>>
    >()
  })

  it('.handler', () => {
    const procedure = builder.handler(({ input, context, procedure, path, signal, errors }) => {
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<{ db: string, auth?: boolean }>()
      expectTypeOf(procedure).toEqualTypeOf<ANY_PROCEDURE>()
      expectTypeOf(path).toEqualTypeOf<string[]>()
      expectTypeOf(signal).toEqualTypeOf<undefined | InstanceType<typeof AbortSignal>>()
      expectTypeOf(errors).toEqualTypeOf<Record<never, never>>()

      return 456
    })

    expectTypeOf(procedure).toMatchTypeOf<
      DecoratedProcedure<{ db: string }, { db: string, auth?: boolean }, undefined, undefined, number, Record<never, never>, Route>
    >()
  })

  it('.prefix', () => {
    expectTypeOf(builder.prefix('/test')).toEqualTypeOf<
      RouterBuilder<{ db: string }, { db: string, auth?: boolean }, Record<never, never>>
    >()
  })

  it('.tag', () => {
    expectTypeOf(builder.tag('test', 'test2')).toEqualTypeOf<
      RouterBuilder<{ db: string }, { db: string, auth?: boolean }, Record<never, never>>
    >()
  })

  it('.router', () => {
    const router = {
      ping: {} as Procedure<{ db: string }, { db: string, auth?: boolean }, undefined, undefined, unknown, typeof errors, Route>,
      pong: {} as Procedure<Context, Context, undefined, undefined, unknown, Record<never, never>, Route>,
    }

    expectTypeOf(builder.router(router)).toEqualTypeOf<
      AdaptedRouter<{ db: string }, typeof router, Record<never, never>>
    >()

    builder.router({
      // @ts-expect-error - context is not match
      ping: {} as Procedure<{ auth: 'invalid' }, Context, undefined, undefined, unknown, typeof errors>,
    })
  })

  it('.lazy', () => {
    const router = {
      ping: {} as Procedure<{ db: string }, { db: string, auth?: boolean }, undefined, undefined, unknown, typeof errors, Route>,
      pong: {} as Procedure<Context, Context, undefined, undefined, unknown, Record<never, never>, Route>,
    }

    expectTypeOf(builder.lazy(() => Promise.resolve({ default: router }))).toEqualTypeOf<
      AdaptedRouter<{ db: string }, Lazy<typeof router>, Record<never, never>>
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
      ChainableImplementer<{ db: string }, { db: string, auth?: boolean }, typeof contract>
    >()
  })
})
