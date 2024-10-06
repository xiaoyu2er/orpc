import type { DecoratedContractProcedure } from '@orpc/contract'
import { z } from 'zod'
import { type DecoratedProcedure, isProcedure } from './procedure'
import { ProcedureBuilder } from './procedure-builder'
import type { ProcedureImplementer } from './procedure-implementer'
import type { Meta } from './types'

const schema1 = z.object({ id: z.string() })
const example1 = { id: '1' }
const schema2 = z.object({ name: z.string() })
const example2 = { name: 'dinwwwh' }

const builder = new ProcedureBuilder<
  { auth: boolean },
  undefined,
  undefined,
  undefined
>({ InputSchema: undefined, OutputSchema: undefined })

it('input', () => {
  const builder2 = builder.input(schema1, example1, { default: example1 })

  expectTypeOf(builder2).toEqualTypeOf<
    ProcedureBuilder<{ auth: boolean }, undefined, typeof schema1, undefined>
  >()

  expect(builder2.zz$pb).toMatchObject({
    InputSchema: schema1,
    inputExample: example1,
    inputExamples: { default: example1 },
  })
})

it('output', () => {
  const builder2 = builder.output(schema2, example2, { default: example2 })

  expectTypeOf(builder2).toEqualTypeOf<
    ProcedureBuilder<{ auth: boolean }, undefined, undefined, typeof schema2>
  >()

  expect(builder2.zz$pb).toMatchObject({
    OutputSchema: schema2,
    outputExample: example2,
    outputExamples: { default: example2 },
  })
})

it('route', () => {
  const builder2 = builder.route({
    method: 'GET',
    path: '/test',
    deprecated: true,
    description: 'des',
    summary: 'sum',
  })

  expectTypeOf(builder2).toEqualTypeOf<
    ProcedureBuilder<{ auth: boolean }, undefined, undefined, undefined>
  >()

  expect(builder2.zz$pb).toMatchObject({
    method: 'GET',
    path: '/test',
    deprecated: true,
    description: 'des',
    summary: 'sum',
  })
})

it('summary', () => {
  const builder2 = builder.summary('sum')

  expectTypeOf(builder2).toEqualTypeOf(builder)

  expect(builder2.zz$pb).toMatchObject({
    summary: 'sum',
  })
})

it('description', () => {
  const builder2 = builder.description('des')

  expectTypeOf(builder2).toEqualTypeOf(builder)

  expect(builder2.zz$pb).toMatchObject({
    description: 'des',
  })
})

it('deprecated', () => {
  const builder2 = builder.deprecated(true)

  expectTypeOf(builder2).toEqualTypeOf(builder)

  expect(builder2.zz$pb).toMatchObject({
    deprecated: true,
  })
})

describe('use middleware', () => {
  it('infer types', () => {
    const implementer = builder
      .use((input, context, meta) => {
        expectTypeOf(input).toEqualTypeOf<unknown>()
        expectTypeOf(context).toEqualTypeOf<{ auth: boolean }>()
        expectTypeOf(meta).toEqualTypeOf<Meta<unknown>>()

        return {
          context: {
            userId: '1',
          },
        }
      })
      .use((input, context, meta) => {
        expectTypeOf(input).toEqualTypeOf<unknown>()
        expectTypeOf(context).toEqualTypeOf<
          { userId: string } & { auth: boolean }
        >()
        expectTypeOf(meta).toEqualTypeOf<Meta<unknown>>()
      })

    expectTypeOf(implementer).toEqualTypeOf<
      ProcedureImplementer<
        { auth: boolean },
        DecoratedContractProcedure<undefined, undefined>,
        { userId: string }
      >
    >()
  })

  it('map middleware input', () => {
    // @ts-expect-error mismatch input
    builder.use((input: { postId: string }) => {
      return { context: { a: 'a' } }
    })

    builder.use(
      (input: { postId: string }) => {
        return { context: { a: 'a' } }
      },
      // @ts-expect-error mismatch input
      (input) => ({ postId: 12455 }),
    )

    builder.use(
      (input: { postId: string }) => {},
      (input) => ({ postId: '12455' }),
    )

    const implementer = builder.input(schema1).use(
      (input: { id: number }) => {
        return {
          context: {
            userId555: '1',
          },
        }
      },
      (input) => ({ id: Number.parseInt(input.id) }),
    )

    expectTypeOf(implementer).toEqualTypeOf<
      ProcedureImplementer<
        { auth: boolean },
        DecoratedContractProcedure<typeof schema1, undefined>,
        { userId555: string }
      >
    >()
  })
})

describe('handler', () => {
  it('infer types', () => {
    const handler = builder.handler((input, context, meta) => {
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<{ auth: boolean }>()
      expectTypeOf(meta).toEqualTypeOf<Meta<unknown>>()
    })

    expectTypeOf(handler).toEqualTypeOf<
      DecoratedProcedure<
        { auth: boolean },
        DecoratedContractProcedure<undefined, undefined>,
        undefined,
        void
      >
    >()

    expect(isProcedure(handler)).toBe(true)
  })

  it('combine middlewares', () => {
    const mid1 = () => {
      return {
        context: {
          userId: '1',
        },
      }
    }

    const mid2 = () => {}

    const handler = builder
      .use(mid1)
      .use(mid2)
      .handler((input, context, meta) => {
        expectTypeOf(input).toEqualTypeOf<unknown>()
        expectTypeOf(context).toEqualTypeOf<
          { userId: string } & { auth: boolean }
        >()
        expectTypeOf(meta).toEqualTypeOf<Meta<unknown>>()

        return {
          name: 'dinwwwh',
        }
      })

    expectTypeOf(handler).toEqualTypeOf<
      DecoratedProcedure<
        { auth: boolean },
        DecoratedContractProcedure<undefined, undefined>,
        { userId: string },
        { name: string }
      >
    >()

    expect(handler.zz$p.middlewares).toEqual([mid1, mid2])
  })
})
