import { toHttpPath } from './utils'

it('convertPathToHttpPath', () => {
  expect(toHttpPath(['ping'])).toEqual('/ping')
  expect(toHttpPath(['nested', 'ping'])).toEqual('/nested/ping')
  expect(toHttpPath(['nested/', 'ping'])).toEqual('/nested%2F/ping')
})
