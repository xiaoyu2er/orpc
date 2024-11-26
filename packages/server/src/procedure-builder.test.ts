import type { MiddlewareMeta } from './middleware'
import type { ProcedureImplementer } from './procedure-implementer'
import type { Meta } from './types'
import { ContractProcedure } from '@orpc/contract'
import { z } from 'zod'
import { os } from '.'
import { type DecoratedProcedure, isProcedure } from './procedure'
import { ProcedureBuilder } from './procedure-builder'

const schema1 = z.object({ id: z.string() })
const example1 = { id: '1' }
const schema2 = z.object({ name: z.string() })
const example2 = { name: 'unnoq' }

const builder = new ProcedureBuilder<
  { auth: boolean },
  undefined,
  undefined,
  undefined
>({
  contract: new ContractProcedure({
    InputSchema: undefined,
    OutputSchema: undefined,
  }),
})

it('input', () => {
  const builder2 = builder.input(schema1, example1)

  expectTypeOf(builder2).toEqualTypeOf<
    ProcedureBuilder<{ auth: boolean }, undefined, typeof schema1, undefined>
  >()

  expect(builder2.zz$pb).toMatchObject({
    contract: {
      zz$cp: {
        InputSchema: schema1,
        inputExample: example1,
      },
    },
  })
})

it('output', () => {
  const builder2 = builder.output(schema2, example2)

  expectTypeOf(builder2).toEqualTypeOf<
    ProcedureBuilder<{ auth: boolean }, undefined, undefined, typeof schema2>
  >()

  expect(builder2.zz$pb).toMatchObject({
    contract: {
      zz$cp: {
        OutputSchema: schema2,
        outputExample: example2,
      },
    },
  })
})

it('route', () => {
  const builder2 = builder.route({
    method: 'GET',
    path: '/test',
    deprecated: true,
    description: 'des',
    summary: 'sum',
    tags: ['hi'],
  })

  expectTypeOf(builder2).toEqualTypeOf<
    ProcedureBuilder<{ auth: boolean }, undefined, undefined, undefined>
  >()

  expect(builder2.zz$pb).toMatchObject({
    contract: {
      zz$cp: {
        method: 'GET',
        path: '/test',
        deprecated: true,
        description: 'des',
        summary: 'sum',
        tags: ['hi'],
      },
    },
  })
})

describe('use middleware', () => {
  it('infer types', () => {
    const implementer = builder
      .use((input, context, meta) => {
        expectTypeOf(input).toEqualTypeOf<unknown>()
        expectTypeOf(context).toEqualTypeOf<{ auth: boolean }>()
        expectTypeOf(meta).toEqualTypeOf<MiddlewareMeta<unknown>>()

        return meta.next({
          context: {
            userId: '1',
          },
        })
      })
      .use((input, context, meta) => {
        expectTypeOf(input).toEqualTypeOf<unknown>()
        expectTypeOf(context).toEqualTypeOf<
          { userId: string } & { auth: boolean }
        >()
        expectTypeOf(meta).toEqualTypeOf<MiddlewareMeta<unknown>>()

        return meta.next({})
      })

    expectTypeOf(implementer).toEqualTypeOf<
      ProcedureImplementer<
        { auth: boolean },
        { userId: string },
        undefined,
        undefined
      >
    >()
  })

  it('map middleware input', () => {
    // @ts-expect-error mismatch input
    builder.use((input: { postId: string }) => {
      return { context: { a: 'a' } }
    })

    builder.use(
      (input: { postId: string }, _, meta) => {
        return meta.next({ context: { a: 'a' } })
      },
      // @ts-expect-error mismatch input
      input => ({ postId: 12455 }),
    )

    builder.use(
      (input: { postId: string }, context, meta) => meta.next({}),
      input => ({ postId: '12455' }),
    )

    const implementer = builder.input(schema1).use(
      (input: { id: number }, _, meta) => {
        return meta.next({
          context: {
            userId555: '1',
          },
        })
      },
      input => ({ id: Number.parseInt(input.id) }),
    )

    expectTypeOf(implementer).toEqualTypeOf<
      ProcedureImplementer<
        { auth: boolean },
        { userId555: string },
        typeof schema1,
        undefined
      >
    >()
  })
})

describe('handler', () => {
  it('infer types', () => {
    const handler = builder.func((input, context, meta) => {
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<{ auth: boolean }>()
      expectTypeOf(meta).toEqualTypeOf<Meta>()
    })

    expectTypeOf(handler).toEqualTypeOf<
      DecoratedProcedure<
        { auth: boolean },
        undefined,
        undefined,
        undefined,
        void
      >
    >()

    expect(isProcedure(handler)).toBe(true)
  })

  it('combine middlewares', () => {
    const mid1 = os.middleware((input, context, meta) => {
      return meta.next({
        context: {
          userId: '1',
        },
      })
    })

    const mid2 = os.middleware((_, __, meta) => meta.next({}))

    const handler = builder
      .use(mid1)
      .use(mid2)
      .func((input, context, meta) => {
        expectTypeOf(input).toEqualTypeOf<unknown>()
        expectTypeOf(context).toEqualTypeOf<
          { userId: string } & { auth: boolean }
        >()
        expectTypeOf(meta).toEqualTypeOf<Meta>()

        return {
          name: 'unnoq',
        }
      })

    expectTypeOf(handler).toEqualTypeOf<
      DecoratedProcedure<
        { auth: boolean },
        { userId: string },
        undefined,
        undefined,
        { name: string }
      >
    >()

    expect(handler.zz$p.middlewares).toEqual([mid1, mid2])
  })
})
