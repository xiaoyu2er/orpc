import { parseEmptyableJSON } from './json'

it('parseEmptyableJSON', () => {
  expect(parseEmptyableJSON('')).toBeUndefined()
  expect(parseEmptyableJSON('{}')).toEqual({})
  expect(parseEmptyableJSON('{"foo":"bar"}')).toEqual({ foo: 'bar' })
})
