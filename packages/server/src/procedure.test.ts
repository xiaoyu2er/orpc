import { ContractProcedure } from '@orpc/contract'
import { Procedure, isProcedure } from './procedure'

it('isProcedure', () => {
  expect(new Procedure({} as any)).toSatisfy(isProcedure)
  expect({
    __p: {
      contract: new ContractProcedure({}),
      handler: () => {},
    },
  }).toSatisfy(isProcedure)

  expect({
    __p: {
      contract: new ContractProcedure({}),
    },
  }).not.toSatisfy(isProcedure)

  expect({
    __p: {
      handler: () => {},
    },
  }).not.toSatisfy(isProcedure)

  expect({}).not.toSatisfy(isProcedure)
  expect(12233).not.toSatisfy(isProcedure)
  expect('12233').not.toSatisfy(isProcedure)
  expect(undefined).not.toSatisfy(isProcedure)
  expect(null).not.toSatisfy(isProcedure)
})
