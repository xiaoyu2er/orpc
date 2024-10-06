import {
  type ContractProcedure,
  DecoratedContractProcedure,
  initORPCContract,
} from '@orpc/contract'
import { z } from 'zod'
import { type Meta, initORPC } from '.'
import { DecoratedProcedure, isProcedure } from './procedure'

it('isProcedure', () => {
  expect(new DecoratedProcedure({} as any)).toSatisfy(isProcedure)
  expect({
    zz$p: {
      contract: new DecoratedContractProcedure({
        InputSchema: undefined,
        OutputSchema: undefined,
      }),
      handler: () => {},
    },
  }).toSatisfy(isProcedure)

  expect({
    zz$p: {
      contract: new DecoratedContractProcedure({
        InputSchema: undefined,
        OutputSchema: undefined,
      }),
    },
  }).not.toSatisfy(isProcedure)

  expect({
    zz$p: {
      handler: () => {},
    },
  }).not.toSatisfy(isProcedure)

  expect({}).not.toSatisfy(isProcedure)
  expect(12233).not.toSatisfy(isProcedure)
  expect('12233').not.toSatisfy(isProcedure)
  expect(undefined).not.toSatisfy(isProcedure)
  expect(null).not.toSatisfy(isProcedure)
})

test('prefix method', () => {
  const p = initORPC.context<{ auth: boolean }>().handler(() => {
    return 'dinwwwh'
  })

  const p2 = p.prefix('/test')

  expect(p2.zz$p.contract.zz$cp.path).toBe(undefined)

  const p3 = initORPC
    .context<{ auth: boolean }>()
    .route({ path: '/test1' })
    .handler(() => {
      return 'dinwwwh'
    })

  const p4 = p3.prefix('/test')
  expect(p4.zz$p.contract.zz$cp.path).toBe('/test/test1')
})

describe('use middleware', () => {
  it('infer types', () => {
    const p1 = initORPC
      .context<{ auth: boolean }>()
      .use(() => {
        return { context: { postId: 'string' } }
      })
      .handler(() => {
        return 'dinwwwh'
      })

    const p2 = p1
      .use((input, context, meta) => {
        expectTypeOf(input).toEqualTypeOf<unknown>()
        expectTypeOf(context).toEqualTypeOf<
          { auth: boolean } & { postId: string }
        >()
        expectTypeOf(meta).toEqualTypeOf<Meta<string>>()

        return {
          context: {
            userId: '1',
          },
        }
      })
      .use((input, context, meta) => {
        expectTypeOf(input).toEqualTypeOf<unknown>()
        expectTypeOf(context).toEqualTypeOf<
          { userId: string } & { postId: string } & { auth: boolean }
        >()
        expectTypeOf(meta).toEqualTypeOf<Meta<string>>()
      })

    expectTypeOf(p2).toEqualTypeOf<
      DecoratedProcedure<
        { auth: boolean },
        DecoratedContractProcedure<undefined, undefined>,
        { postId: string } & { userId: string },
        string
      >
    >()
  })

  it('can map input', () => {
    const mid = (input: { id: number }) => {}

    initORPC.input(z.object({ postId: z.number() })).use(mid, (input) => {
      expectTypeOf(input).toEqualTypeOf<{ postId: number }>()

      return {
        id: input.postId,
      }
    })

    // @ts-expect-error mismatch input
    initORPC.input(z.object({ postId: z.number() })).use(mid)

    // @ts-expect-error mismatch input
    initORPC.input(z.object({ postId: z.number() })).use(mid, (input) => {
      return {
        wrong: input.postId,
      }
    })
  })

  it('add middlewares to beginning', () => {
    const mid1 = vi.fn()
    const mid2 = vi.fn()
    const mid3 = vi.fn()

    const p1 = initORPC.use(mid1).handler(() => 'dinwwwh')
    const p2 = p1.use(mid2).use(mid3)

    expect(p2.zz$p.middlewares).toEqual([mid3, mid2, mid1])
  })
})
