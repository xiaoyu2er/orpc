import { baseErrorMap } from '../tests/shared'
import { mergeErrorMap } from './error-map'

it('mergeErrorMap', () => {
  expect(mergeErrorMap(baseErrorMap, baseErrorMap)).toEqual(baseErrorMap)
  expect(mergeErrorMap(baseErrorMap, { OVERRIDE: {}, INVALID: {} })).toEqual(
    { OVERRIDE: {}, INVALID: {}, BASE: baseErrorMap.BASE },
  )
})
