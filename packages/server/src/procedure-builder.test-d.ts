import type { ORPCErrorConstructorMap } from './error'
import type { MiddlewareOutputFn } from './middleware'
import type { ANY_PROCEDURE } from './procedure'
import type { ProcedureBuilder } from './procedure-builder'
import type { ProcedureBuilderWithInput } from './procedure-builder-with-input'
import type { ProcedureBuilderWithOutput } from './procedure-builder-with-output'
import type { DecoratedProcedure } from './procedure-decorated'
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

const builder = {} as ProcedureBuilder<{ db: string }, { db: string } & { auth?: boolean }, typeof baseErrors>

const schema = z.object({ id: z.string().transform(v => Number.parseInt(v)) })

describe('ProcedureBuilder', () => {
  it('.errors', () => {
    const errors = { CODE: { message: 'MESSAGE' } }

    expectTypeOf(builder.errors(errors)).toEqualTypeOf<
      ProcedureBuilder < { db: string }, { db: string } & { auth?: boolean }, typeof baseErrors & typeof errors>
    >()

    // @ts-expect-error - not allow redefine error map
    builder.errors({ BASE: baseErrors.BASE })
  })

  it('.route', () => {
    expectTypeOf(builder.route({ tags: ['a'] })).toEqualTypeOf<typeof builder>()
  })

  it('.use', () => {
    const applied = builder.use(({ context, next, path, procedure, errors }, input, output) => {
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<{ db: string } & { auth?: boolean }>()
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

    expectTypeOf(applied).toEqualTypeOf<
      ProcedureBuilder < { db: string }, { db: string } & { auth?: boolean } & { extra: boolean }, typeof baseErrors>
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
      ProcedureBuilderWithInput < { db: string }, { db: string } & { auth?: boolean }, typeof schema, typeof baseErrors>
    >()
  })

  it('.output', () => {
    expectTypeOf(builder.output(schema)).toEqualTypeOf<
      ProcedureBuilderWithOutput<{ db: string }, { db: string } & { auth?: boolean }, typeof schema, typeof baseErrors>
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

      return 456
    })

    expectTypeOf(procedure).toMatchTypeOf<
      DecoratedProcedure<{ db: string }, { db: string } & { auth?: boolean }, undefined, undefined, number, typeof baseErrors>
    >()
  })
})
