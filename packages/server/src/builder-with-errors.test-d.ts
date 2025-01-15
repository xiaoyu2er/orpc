import type { BuilderWithErrors } from './builder-with-errors'
import type { BuilderWithErrorsMiddlewares } from './builder-with-errors-middlewares'
import type { ORPCErrorConstructorMap } from './error'
import type { Lazy } from './lazy'
import type { MiddlewareOutputFn } from './middleware'
import type { DecoratedMiddleware } from './middleware-decorated'
import type { ANY_PROCEDURE, Procedure } from './procedure'
import type { ProcedureBuilder } from './procedure-builder'
import type { ProcedureBuilderWithInput } from './procedure-builder-with-input'
import type { ProcedureBuilderWithOutput } from './procedure-builder-with-output'
import type { DecoratedProcedure } from './procedure-decorated'
import type { AdaptedRouter, RouterBuilder } from './router-builder'
import type { WELL_CONTEXT } from './types'
import { z } from 'zod'

const schema = z.object({ val: z.string().transform(v => Number.parseInt(v)) })

const baseErrors = {
  BASE: {
    data: z.string(),
  },
}

const errors = {
  CODE: {
    status: 404,
    data: z.object({ why: z.string() }),
  },
}

const builder = {} as BuilderWithErrors<{ db: string }, typeof baseErrors>

describe('BuilderWithErrors', () => {
  it('.context', () => {
    expectTypeOf(builder.context()).toEqualTypeOf<BuilderWithErrors<{ db: string }, typeof baseErrors>>()
    expectTypeOf(builder.context<{ anything: string }>()).toEqualTypeOf<BuilderWithErrors<{ anything: string }, typeof baseErrors>>()
  })

  it('.middleware', () => {
    const mid = builder.middleware(({ context, next, path, procedure, errors }, input, output) => {
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<{ db: string }>()
      expectTypeOf(path).toEqualTypeOf<string[]>()
      expectTypeOf(procedure).toEqualTypeOf<ANY_PROCEDURE>()
      expectTypeOf(output).toEqualTypeOf<MiddlewareOutputFn<any>>()
      expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrors>>()

      return next({
        context: {
          extra: true,
        },
      })
    })

    expectTypeOf(mid).toEqualTypeOf<
      DecoratedMiddleware<{ db: string }, { extra: boolean }, unknown, any, ORPCErrorConstructorMap<typeof baseErrors>>
    >()
  })

  it('.errors', () => {
    expectTypeOf(builder.errors(errors)).toEqualTypeOf<BuilderWithErrors<{ db: string }, typeof errors & typeof baseErrors>>()

    // @ts-expect-error --- not allow redefine error map
    builder.errors({ BASE: baseErrors.BASE })
  })

  it('.use', () => {
    const applied = builder.use(({ context, next, path, procedure, errors }, input, output) => {
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<{ db: string }>()
      expectTypeOf(path).toEqualTypeOf<string[]>()
      expectTypeOf(procedure).toEqualTypeOf<ANY_PROCEDURE>()
      expectTypeOf(output).toEqualTypeOf<MiddlewareOutputFn<unknown>>()
      expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrors>>()

      return next({
        context: {
          extra: true,
        },
      })
    })

    expectTypeOf(applied).toEqualTypeOf<BuilderWithErrorsMiddlewares<{ db: string }, { extra: boolean }, typeof baseErrors>>()

    // @ts-expect-error --- conflict context
    builder.middleware(({ next }) => ({ db: 123 }))
  })

  it('.route', () => {
    expectTypeOf(builder.route({ path: '/test', method: 'GET' })).toEqualTypeOf<
      ProcedureBuilder<{ db: string }, undefined, typeof baseErrors>
    >()
  })

  it('.input', () => {
    expectTypeOf(builder.input(schema)).toEqualTypeOf<
      ProcedureBuilderWithInput<{ db: string }, undefined, typeof schema, typeof baseErrors>
    >()
  })

  it('.output', () => {
    expectTypeOf(builder.output(schema)).toEqualTypeOf<
      ProcedureBuilderWithOutput<{ db: string }, undefined, typeof schema, typeof baseErrors>
    >()
  })

  it('.handler', () => {
    const procedure = builder.handler(({ input, context, procedure, path, signal, errors }) => {
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<{ db: string }>()
      expectTypeOf(procedure).toEqualTypeOf<ANY_PROCEDURE>()
      expectTypeOf(path).toEqualTypeOf<string[]>()
      expectTypeOf(signal).toEqualTypeOf<undefined | InstanceType<typeof AbortSignal>>()
      expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrors>>()

      return 456
    })

    expectTypeOf(procedure).toMatchTypeOf<
      DecoratedProcedure<{ db: string }, undefined, undefined, undefined, number, typeof baseErrors>
    >()
  })

  it('.prefix', () => {
    expectTypeOf(builder.prefix('/test')).toEqualTypeOf<
      RouterBuilder<{ db: string }, undefined, typeof baseErrors>
    >()
  })

  it('.tag', () => {
    expectTypeOf(builder.tag('test', 'test2')).toEqualTypeOf<
      RouterBuilder<{ db: string }, undefined, typeof baseErrors>
    >()
  })

  it('.router', () => {
    const router = {
      ping: {} as Procedure<{ db: string }, undefined, undefined, undefined, unknown, typeof errors>,
      pong: {} as Procedure<WELL_CONTEXT, undefined, undefined, undefined, unknown, Record<never, never>>,
    }

    expectTypeOf(builder.router(router)).toEqualTypeOf<
      AdaptedRouter<{ db: string }, typeof router, typeof baseErrors>
    >()

    builder.router({
      // @ts-expect-error - context is not match
      ping: {} as Procedure<{ auth: 'invalid' }, undefined, undefined, undefined, unknown, typeof errors>,
    })

    builder.router({
      // @ts-expect-error - error map is not match
      ping: {} as Procedure<WELL_CONTEXT, undefined, undefined, undefined, unknown, { BASE: { message: 'invalid' } }>,
    })
  })

  it('.lazy', () => {
    const router = {
      ping: {} as Procedure<{ db: string }, undefined, undefined, undefined, unknown, typeof errors>,
      pong: {} as Procedure<WELL_CONTEXT, undefined, undefined, undefined, unknown, Record<never, never>>,
    }

    expectTypeOf(builder.lazy(() => Promise.resolve({ default: router }))).toEqualTypeOf<
      AdaptedRouter<{ db: string }, Lazy<typeof router>, typeof baseErrors>
    >()

    // @ts-expect-error - context is not match
    builder.lazy(() => Promise.resolve({ default: {
      ping: {} as Procedure<{ auth: 'invalid' }, undefined, undefined, undefined, unknown, typeof errors>,
    } }))

    // @ts-expect-error - error map is not match
    builder.lazy(() => Promise.resolve({
      default: {
        ping: {} as Procedure<WELL_CONTEXT, undefined, undefined, undefined, unknown, { BASE: { message: 'invalid' } }>,
      },
    }))
  })
})
