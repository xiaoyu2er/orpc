import type { ErrorMap } from './error-map'
import { z } from 'zod'
import { fallbackORPCErrorMessage, fallbackORPCErrorStatus, isDefinedError, ORPCError, validateORPCError } from './error-orpc'

it('fallbackORPCErrorStatus', () => {
  expect(fallbackORPCErrorStatus('BAD_GATEWAY', 500)).toBe(500)
  expect(fallbackORPCErrorStatus('BAD_GATEWAY', undefined)).toBe(502)
  expect(fallbackORPCErrorStatus('ANYTHING', 405)).toBe(405)
  expect(fallbackORPCErrorStatus('ANYTHING', undefined)).toBe(500)
})

it('fallbackORPCErrorMessage', () => {
  expect(fallbackORPCErrorMessage('BAD_GATEWAY', 'message')).toBe('message')
  expect(fallbackORPCErrorMessage('BAD_GATEWAY', undefined)).toBe('Bad Gateway')
  expect(fallbackORPCErrorMessage('ANYTHING', 'message')).toBe('message')
  expect(fallbackORPCErrorMessage('ANYTHING', undefined)).toBe('ANYTHING')
})

describe('oRPCError', () => {
  it('works', () => {
    const error = new ORPCError({ defined: true, code: 'BAD_GATEWAY', status: 500, message: 'message', data: 'data', cause: 'cause' })
    expect(error.defined).toBe(true)
    expect(error.code).toBe('BAD_GATEWAY')
    expect(error.status).toBe(500)
    expect(error.message).toBe('message')
    expect(error.data).toBe('data')
    expect(error.cause).toBe('cause')
  })

  it('default defined=false', () => {
    const error = new ORPCError({ code: 'BAD_GATEWAY' })
    expect(error.defined).toBe(false)
  })

  it('fallback status', () => {
    const error = new ORPCError({ code: 'BAD_GATEWAY' })
    expect(error.status).toBe(502)
  })

  it('fallback message', () => {
    const error = new ORPCError({ code: 'BAD_GATEWAY' })
    expect(error.message).toBe('Bad Gateway')
  })

  it('oRPCError throw when invalid status', () => {
    expect(() => new ORPCError({ code: 'BAD_GATEWAY', status: 100 })).toThrowError()
    expect(() => new ORPCError({ code: 'BAD_GATEWAY', status: -1 })).toThrowError()
  })

  it('toJSON', () => {
    const error = new ORPCError({ code: 'BAD_GATEWAY', status: 500, message: 'message', data: 'data', cause: 'cause' })
    expect(error.toJSON()).toEqual({
      defined: false,
      code: 'BAD_GATEWAY',
      status: 500,
      message: 'message',
      data: 'data',
    })
  })

  it('isValidJSON', () => {
    const error = new ORPCError({ code: 'BAD_GATEWAY', status: 500, message: 'message', data: 'data', cause: 'cause' })
    expect(ORPCError.isValidJSON(error.toJSON())).toBe(true)
    expect(ORPCError.isValidJSON({})).toBe(false)
    expect(ORPCError.isValidJSON({ defined: true })).toBe(false)
    expect(ORPCError.isValidJSON({ defined: true, code: 'BAD_GATEWAY', status: 500, message: 'message', data: 'data' })).toBe(true)
  })
})

it('isDefinedError', () => {
  expect(isDefinedError(new ORPCError({ code: 'BAD_GATEWAY' }))).toBe(false)
  expect(isDefinedError(new ORPCError({ defined: true, code: 'BAD_GATEWAY' }))).toBe(true)
  expect(isDefinedError({ defined: true, code: 'BAD_GATEWAY' })).toBe(false)
})

describe('validateORPCError', () => {
  const errors: ErrorMap = {
    BAD_GATEWAY: {
      data: z.object({
        value: z.string().transform(v => Number.parseInt(v)),
      }),
    },
    CONFLICT: {
    },
  }

  it('ignore not-match errors when defined=false', async () => {
    const e1 = new ORPCError({ code: 'BAD_GATEWAY', status: 501 })
    expect(await validateORPCError(errors, e1)).toBe(e1)

    const e2 = new ORPCError({ code: 'NOT_FOUND' })
    expect(await validateORPCError(errors, e2)).toBe(e2)

    const e3 = new ORPCError({ code: 'BAD_GATEWAY', data: 'invalid' })
    expect(await validateORPCError(errors, e3)).toBe(e3)
  })

  it('modify not-match errors when defined=true', async () => {
    const e1 = new ORPCError({ defined: true, code: 'BAD_GATEWAY', status: 501 })
    const v1 = await validateORPCError(errors, e1)
    expect(v1).not.toBe(e1)
    expect({ ...v1 }).toEqual({ ...e1, defined: false })

    const e2 = new ORPCError({ defined: true, code: 'NOT_FOUND' })
    const v2 = await validateORPCError(errors, e2)
    expect(v2).not.toBe(e2)
    expect({ ...v2 }).toEqual({ ...e2, defined: false })

    const e3 = new ORPCError({ defined: true, code: 'BAD_GATEWAY', data: 'invalid' })
    const v3 = await validateORPCError(errors, e3)
    expect(v3).not.toBe(e3)
    expect({ ...v3 }).toEqual({ ...e3, defined: false })
  })

  it('ignore match errors when defined=true and data schema is undefined', async () => {
    const e1 = new ORPCError({ defined: true, code: 'CONFLICT' })
    expect(await validateORPCError(errors, e1)).toBe(e1)
  })

  it('return new error when defined=true and data schema is undefined with match error', async () => {
    const e1 = new ORPCError({ code: 'CONFLICT' })
    const v1 = await validateORPCError(errors, e1)
    expect(v1).not.toBe(e1)
    expect({ ...v1 }).toEqual({ ...e1, defined: true })
  })

  it('return new with defined=true and validated data with match errors', async () => {
    const e1 = new ORPCError({ code: 'BAD_GATEWAY', data: { value: '123' } })
    const v1 = await validateORPCError(errors, e1)
    expect(v1).not.toBe(e1)
    expect({ ...v1 }).toEqual({ ...e1, defined: true, data: { value: 123 } })
  })
})
