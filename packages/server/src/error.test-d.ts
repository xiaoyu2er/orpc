import type { ORPCError } from '@orpc/contract'
import type { ORPCErrorConstructorMap } from './error'
import { z } from 'zod'

const schema1 = z.object({ val: z.string().transform(v => Number(v)) })
const schema2 = z.object({ why: z.string() })

it('ORPCErrorConstructorMap', () => {
  const constructors = {} as ORPCErrorConstructorMap<{
    BAD_GATEWAY: {
      status: 502
      message: 'Bad Gateway'
      data: typeof schema1
    }
    UNAUTHORIZED: {
      status: 401
      message: 'Unauthorized'
      data: typeof schema2
    }
    PAYMENT_REQUIRED: {
      status: 402
    }
  }>

  expectTypeOf(constructors.BAD_GATEWAY({ data: { val: '123' } })).toEqualTypeOf<ORPCError<'BAD_GATEWAY', { val: number }>>()
  expectTypeOf(constructors.UNAUTHORIZED({ data: { why: '123' } })).toEqualTypeOf<ORPCError<'UNAUTHORIZED', { why: string }>>()
  expectTypeOf(constructors.PAYMENT_REQUIRED({})).toEqualTypeOf<ORPCError<'PAYMENT_REQUIRED', unknown>>()
  expectTypeOf(constructors.PAYMENT_REQUIRED()).toEqualTypeOf<ORPCError<'PAYMENT_REQUIRED', unknown>>()

  // @ts-expect-error - invalid data
  constructors.BAD_GATEWAY({ data: { val: 123 } })
  // @ts-expect-error - data is required
  constructors.BAD_GATEWAY({ data: {} })
  // @ts-expect-error - required options
  constructors.BAD_GATEWAY()
})
