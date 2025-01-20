import { ContractProcedure } from '@orpc/contract'
import { isProcedure, Procedure } from './procedure'

describe('isProcedure', () => {
  const procedure = new Procedure({
    contract: new ContractProcedure({
      InputSchema: undefined,
      OutputSchema: undefined,
      errorMap: {},
      route: {},
    }),
    handler: () => {},
    inputValidationIndex: 0,
    outputValidationIndex: 0,
    middlewares: [],
  })

  it('works', () => {
    expect(procedure).toSatisfy(isProcedure)
    expect({}).not.toSatisfy(isProcedure)
    expect(true).not.toSatisfy(isProcedure)
  })

  it('works with raw object', () => {
    expect(Object.assign({}, procedure)).toSatisfy(isProcedure)
  })
})
