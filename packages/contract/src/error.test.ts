import { ValidationError } from './error'

it('validationError', () => {
  const error = new ValidationError({ message: 'message', issues: [{ message: 'message' }] })
  expect(error).toBeInstanceOf(Error)
  expect(error.issues).toEqual([{ message: 'message' }])
})
