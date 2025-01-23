import { ping } from '../tests/shared'
import { isProcedure } from './procedure'

it('isProcedure', () => {
  expect(ping).toSatisfy(isProcedure)
  expect(Object.assign({}, ping)).toSatisfy(isProcedure)

  expect({}).not.toSatisfy(isProcedure)
  expect(true).not.toSatisfy(isProcedure)
})
