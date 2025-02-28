import { stringifyJSON } from './json'

it('stringifyJSON', () => {
  expectTypeOf(stringifyJSON(undefined)).toEqualTypeOf<string | undefined>()
  expectTypeOf(stringifyJSON({})).toEqualTypeOf<string>()
})
