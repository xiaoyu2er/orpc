import { fallbackORPCErrorMessage, fallbackORPCErrorStatus, ORPCError } from './error-orpc'

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
    const error = new ORPCError('BAD_GATEWAY', { defined: true, status: 500, message: 'message', data: 'data', cause: 'cause' })
    expect(error.defined).toBe(true)
    expect(error.code).toBe('BAD_GATEWAY')
    expect(error.status).toBe(500)
    expect(error.message).toBe('message')
    expect(error.data).toBe('data')
    expect(error.cause).toBe('cause')
  })

  it('default defined=false', () => {
    const error = new ORPCError('BAD_GATEWAY')
    expect(error.defined).toBe(false)
  })

  it('fallback status', () => {
    const error = new ORPCError('BAD_GATEWAY')
    expect(error.status).toBe(502)
  })

  it('fallback message', () => {
    const error = new ORPCError('BAD_GATEWAY')
    expect(error.message).toBe('Bad Gateway')
  })

  it('oRPCError throw when invalid status', () => {
    expect(() => new ORPCError('BAD_GATEWAY', { status: 100 })).toThrowError()
    expect(() => new ORPCError('BAD_GATEWAY', { status: -1 })).toThrowError()
  })

  it('toJSON', () => {
    const error = new ORPCError('BAD_GATEWAY', { status: 500, message: 'message', data: 'data', cause: 'cause' })
    expect(error.toJSON()).toEqual({
      defined: false,
      code: 'BAD_GATEWAY',
      status: 500,
      message: 'message',
      data: 'data',
    })
  })

  it('fromJSON', () => {
    const error = ORPCError.fromJSON({
      defined: true,
      code: 'BAD_GATEWAY',
      status: 500,
      message: 'message',
      data: 'data',
    })
    expect(error.defined).toBe(true)
    expect(error.code).toBe('BAD_GATEWAY')
    expect(error.status).toBe(500)
    expect(error.message).toBe('message')
    expect(error.data).toBe('data')
  })

  it('isValidJSON', () => {
    const error = new ORPCError('BAD_GATEWAY', { status: 500, message: 'message', data: 'data', cause: 'cause' })
    expect(ORPCError.isValidJSON(error.toJSON())).toBe(true)
    expect(ORPCError.isValidJSON({})).toBe(false)
    expect(ORPCError.isValidJSON({ defined: true })).toBe(false)
    expect(ORPCError.isValidJSON({ defined: true, code: 'BAD_GATEWAY', status: 500, message: 'message', data: 'data' })).toBe(true)
    expect(ORPCError.isValidJSON({ defined: true, code: 'BAD_GATEWAY', status: 500, message: 'message', data: 'data', extra: true })).toBe(false)
  })
})
