import { isTypescriptObject } from './object'

it('isTypescriptObject', () => {
  expect(new Error('hi')).toSatisfy(isTypescriptObject)
  expect({}).toSatisfy(isTypescriptObject)
  expect(() => { }).toSatisfy(isTypescriptObject)
  expect(new Proxy({}, {})).toSatisfy(isTypescriptObject)

  expect(1).not.toSatisfy(isTypescriptObject)
  expect(null).not.toSatisfy(isTypescriptObject)
  expect(undefined).not.toSatisfy(isTypescriptObject)
  expect(true).not.toSatisfy(isTypescriptObject)
})
