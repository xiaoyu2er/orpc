import { toError } from './error'

it('toError', () => {
  const error = new Error('hi')

  expect(toError(error)).toBe(error)

  const e2 = { message: 'hi' }
  expect(toError(e2)).toBeInstanceOf(Error)
  expect(toError(e2).message).toEqual('Unknown error')
  expect(toError(e2).cause).toEqual(e2)
})
