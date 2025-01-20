import type { Route } from '@orpc/contract'
import type { ORPCErrorConstructorMap } from './error'
import type { MiddlewareOutputFn } from './middleware'
import type { ANY_PROCEDURE } from './procedure'
import type { ProcedureBuilderWithOutput } from './procedure-builder-with-output'
import type { DecoratedProcedure } from './procedure-decorated'
import type { ProcedureImplementer } from './procedure-implementer'
import { z } from 'zod'

const baseErrors = {
  BASE: {
    status: 402,
    message: 'default message',
    data: z.object({
      why: z.string(),
    }),
  },
}

const outputSchema = z.object({ output: z.string().transform(v => Number.parseInt(v)) })

const builder = {} as ProcedureBuilderWithOutput<{ db: string }, { db: string } & { auth?: boolean }, typeof outputSchema, typeof baseErrors>

const schema = z.object({ id: z.string().transform(v => Number.parseInt(v)) })

describe('ProcedureBuilderWithOutput', () => {
  it('.errors', () => {
    const errors = { CODE: { message: 'MESSAGE' } }

    expectTypeOf(builder.errors(errors)).toEqualTypeOf<
      ProcedureBuilderWithOutput < { db: string }, { db: string } & { auth?: boolean }, typeof outputSchema, typeof baseErrors & typeof errors>
    >()

    // @ts-expect-error - not allow redefine error map
    builder.errors({ BASE: baseErrors.BASE })
  })

  it('.route', () => {
    expectTypeOf(builder.route({ tags: ['a'] })).toEqualTypeOf<typeof builder>()
  })

  describe('.use', () => {
    const applied = builder.use(({ context, next, path, procedure, errors }, input, output) => {
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<{ db: string } & { auth?: boolean }>()
      expectTypeOf(path).toEqualTypeOf<string[]>()
      expectTypeOf(procedure).toEqualTypeOf<ANY_PROCEDURE>()
      expectTypeOf(output).toEqualTypeOf<MiddlewareOutputFn<{ output: string }>>()
      expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrors>>()

      return next({
        context: {
          extra: true,
        },
      })
    })

    expectTypeOf(applied).toEqualTypeOf<
      ProcedureBuilderWithOutput < { db: string }, { db: string } & { auth?: boolean } & { extra: boolean }, typeof outputSchema, typeof baseErrors>
    >()

    // @ts-expect-error --- conflict context
    builder.use(({ next }) => next({ context: { db: 123 } }))
    // @ts-expect-error --- input is not match
    builder.use(({ next }, input: 'invalid') => next({}))
    // @ts-expect-error --- output is not match
    builder.use(({ next }, input, output: MiddlewareOutputFn<'invalid'>) => next({}))
    // conflict context but not detected
    expectTypeOf(builder.use(({ next }) => next({ context: { db: undefined } }))).toEqualTypeOf<never>()
  })

  it('.input', () => {
    expectTypeOf(builder.input(schema)).toEqualTypeOf<
      ProcedureImplementer<{ db: string }, { db: string } & { auth?: boolean }, typeof schema, typeof outputSchema, typeof baseErrors, Route>
    >()
  })

  it('.handler', () => {
    const procedure = builder.handler(({ input, context, procedure, path, signal, errors }) => {
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<{ db: string } & { auth?: boolean }>()
      expectTypeOf(procedure).toEqualTypeOf<ANY_PROCEDURE>()
      expectTypeOf(path).toEqualTypeOf<string[]>()
      expectTypeOf(signal).toEqualTypeOf<undefined | InstanceType<typeof AbortSignal>>()
      expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrors>>()

      return { output: '123' }
    })

    expectTypeOf(procedure).toMatchTypeOf<
      DecoratedProcedure<{ db: string }, { db: string } & { auth?: boolean }, undefined, typeof outputSchema, { output: string }, typeof baseErrors, Route>
    >()

    // @ts-expect-error --- invalid output
    builder.handler(() => ({ output: 123 }))
  })
})
