import { baseErrorMap } from '../tests/shared'
import { createStrictErrorMap, mergeErrorMap } from './error-map'

it('createStrictErrorMap', () => {
  expect(createStrictErrorMap(baseErrorMap)).toBe(baseErrorMap)
})

it('mergeErrorMap', () => {
  expect(mergeErrorMap(baseErrorMap, baseErrorMap)).toEqual(baseErrorMap)
  expect(mergeErrorMap(baseErrorMap, { BASE: {}, INVALID: {} })).toEqual({ BASE: {}, INVALID: {} })
})
