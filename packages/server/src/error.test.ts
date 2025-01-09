import { ORPCError } from '@orpc/contract'
import { z } from 'zod'
import { createORPCErrorConstructorMap } from './error'

const baseErrors = {
  BAD_GATEWAY: {
    message: '__message__',
    data: z.object({
      val: z.string().transform(v => Number(v)),
    }),
  },
  UNAUTHORIZED: {
    status: 499,
    message: '__message__',
    data: z.object({
      why: z.string(),
    }),
  },
  PAYMENT_REQUIRED: {},
} as const

describe('createORPCErrorConstructorMap', () => {
  it('works with undefined', () => {
    expect(createORPCErrorConstructorMap(undefined)).toEqual({})
  })

  const constructors = createORPCErrorConstructorMap(baseErrors)

  it('create ORPC Error', () => {
    expect(constructors.BAD_GATEWAY({ data: { val: '123' } })).toBeInstanceOf(ORPCError)
    expect(constructors.BAD_GATEWAY({ data: { val: '123' }, cause: '__cause__', message: '__message__' })).toMatchObject({
      defined: true,
      code: 'BAD_GATEWAY',
      status: 502,
      message: '__message__',
      data: { val: '123' },
      cause: '__cause__',
    })
  })

  it('fallback message', () => {
    const error = constructors.BAD_GATEWAY({ data: { val: '123' } })

    expect(error.message).toBe('__message__')
  })

  it('inherit status', () => {
    const error = constructors.UNAUTHORIZED({ data: { why: '123' } })
    expect(error.status).toBe(499)
  })
})
