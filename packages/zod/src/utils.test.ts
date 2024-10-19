import { coerceType } from './utils'

it('string', () => {
  const expected = 'string' as const

  expect(coerceType('abc', expected)).toEqual('abc')
  expect(coerceType('1', expected)).toEqual('1')
  expect(coerceType(1, expected)).toEqual('1')

  expect(coerceType(false, expected)).toEqual(false)
  expect(coerceType(null, expected)).toEqual(null)
  expect(coerceType(undefined, expected)).toEqual(undefined)
  expect(coerceType([], expected)).toEqual([])
  expect(coerceType({}, expected)).toEqual({})
})

it('number', () => {
  const expected = 'number' as const

  expect(coerceType('abc', expected)).toEqual('abc')
  expect(coerceType('1', expected)).toEqual(1)
  expect(coerceType(1, expected)).toEqual(1)

  expect(coerceType(false, expected)).toEqual(false)
  expect(coerceType(null, expected)).toEqual(null)
  expect(coerceType(undefined, expected)).toEqual(undefined)
  expect(coerceType([], expected)).toEqual([])
  expect(coerceType({}, expected)).toEqual({})
})

it('float', () => {
  const expected = 'float' as const

  expect(coerceType('abc', expected)).toEqual('abc')
  expect(coerceType('1', expected)).toEqual(1)
  expect(coerceType(1, expected)).toEqual(1)

  expect(coerceType(false, expected)).toEqual(false)
  expect(coerceType(null, expected)).toEqual(null)
  expect(coerceType(undefined, expected)).toEqual(undefined)
  expect(coerceType([], expected)).toEqual([])
  expect(coerceType({}, expected)).toEqual({})
})

it('integer', () => {
  const expected = 'integer' as const

  expect(coerceType('abc', expected)).toEqual('abc')
  expect(coerceType('1', expected)).toEqual(1)
  expect(coerceType(1, expected)).toEqual(1)

  expect(coerceType(false, expected)).toEqual(false)
  expect(coerceType(null, expected)).toEqual(null)
  expect(coerceType(undefined, expected)).toEqual(undefined)
  expect(coerceType([], expected)).toEqual([])
  expect(coerceType({}, expected)).toEqual({})
})

it('bigint', () => {
  const expected = 'bigint' as const

  expect(coerceType('abc', expected)).toEqual('abc')
  expect(coerceType('1', expected)).toEqual(1n)
  expect(coerceType(1, expected)).toEqual(1n)

  expect(coerceType(false, expected)).toEqual(false)
  expect(coerceType(null, expected)).toEqual(null)
  expect(coerceType(undefined, expected)).toEqual(undefined)
  expect(coerceType([], expected)).toEqual([])
  expect(coerceType({}, expected)).toEqual({})
})

it('nan', () => {
  const expected = 'nan' as const

  expect(coerceType('abc', expected)).toEqual(Number.NaN)
  expect(coerceType('1', expected)).toEqual(1)
  expect(coerceType(1, expected)).toEqual(1)

  expect(coerceType(false, expected)).toEqual(false)
  expect(coerceType(null, expected)).toEqual(null)
  expect(coerceType(undefined, expected)).toEqual(undefined)
  expect(coerceType([], expected)).toEqual([])
  expect(coerceType({}, expected)).toEqual({})
})

it('boolean', () => {
  const expected = 'boolean' as const

  expect(coerceType('', expected)).toEqual(false)
  expect(coerceType('0', expected)).toEqual(false)
  expect(coerceType(0, expected)).toEqual(false)
  expect(coerceType('off', expected)).toEqual(false)
  expect(coerceType('false', expected)).toEqual(false)
  expect(coerceType('False', expected)).toEqual(false)

  expect(coerceType('1', expected)).toEqual(true)
  expect(coerceType(1, expected)).toEqual(true)
  expect(coerceType('on', expected)).toEqual(true)
  expect(coerceType('true', expected)).toEqual(true)
  expect(coerceType('True', expected)).toEqual(true)

  expect(coerceType('abc', expected)).toEqual(true)
  expect(coerceType('879', expected)).toEqual(true)

  expect(coerceType(false, expected)).toEqual(false)
  expect(coerceType(null, expected)).toEqual(null)
  expect(coerceType(undefined, expected)).toEqual(undefined)
  expect(coerceType([], expected)).toEqual([])
  expect(coerceType({}, expected)).toEqual({})
})

it('date', () => {
  const expected = 'date' as const

  expect(coerceType('abc', expected)).toEqual('abc')
  expect(coerceType('1', expected)).toEqual('1')
  expect(coerceType(1, expected)).toEqual(1)
  expect(coerceType('2023-01-01', expected)).toEqual(new Date('2023-01-01'))
  expect(coerceType('2023-01-01T00:00:00', expected)).toEqual(
    new Date('2023-01-01T00:00:00'),
  )

  expect(coerceType('09:06:00', expected)).toEqual(new Date('09:06:00'))

  expect(coerceType(false, expected)).toEqual(false)
  expect(coerceType(null, expected)).toEqual(null)
  expect(coerceType(undefined, expected)).toEqual(undefined)
  expect(coerceType([], expected)).toEqual([])
  expect(coerceType({}, expected)).toEqual({})
})
