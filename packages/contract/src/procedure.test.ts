import { z } from 'zod'
import { ContractProcedure, isContractProcedure } from './procedure'

describe('contractProcedure', () => {
  it('throws error when route.successStatus is not between 200 and 299', () => {
    expect(
      () => new ContractProcedure({ InputSchema: undefined, OutputSchema: undefined, route: { successStatus: 100 } }),
    ).toThrowError()
    expect(
      () => new ContractProcedure({ InputSchema: undefined, OutputSchema: undefined, route: { successStatus: 300 } }),
    ).toThrowError()
    expect(
      () => new ContractProcedure({ InputSchema: undefined, OutputSchema: undefined, route: { successStatus: 299 } }),
    ).not.toThrowError()
  })
})

describe('isContractProcedure', () => {
  it('works', () => {
    expect(new ContractProcedure({ InputSchema: undefined, OutputSchema: undefined })).toSatisfy(isContractProcedure)
    expect(new ContractProcedure({ InputSchema: z.object({}), OutputSchema: undefined })).toSatisfy(isContractProcedure)
    expect(new ContractProcedure({ InputSchema: z.object({}), OutputSchema: undefined, route: {} })).toSatisfy(isContractProcedure)
    expect({}).not.toSatisfy(isContractProcedure)
    expect(true).not.toSatisfy(isContractProcedure)
    expect(1).not.toSatisfy(isContractProcedure)
    expect({ '~orpc': {} }).not.toSatisfy(isContractProcedure)
  })

  it('works with raw object', () => {
    expect(Object.assign({}, new ContractProcedure({ InputSchema: undefined, OutputSchema: undefined }))).toSatisfy(isContractProcedure)
    expect(Object.assign({}, new ContractProcedure({ InputSchema: z.object({}), OutputSchema: undefined }))).toSatisfy(isContractProcedure)
    expect(Object.assign({}, new ContractProcedure({ InputSchema: z.object({}), OutputSchema: undefined, route: {} }))).toSatisfy(isContractProcedure)
  })
})
