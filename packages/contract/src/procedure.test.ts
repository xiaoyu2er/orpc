import { ping, pong } from '../tests/shared'
import { ContractProcedure, isContractProcedure } from './procedure'

describe('contractProcedure', () => {
  it('throws error when route.successStatus is not between 200 and 299', () => {
    expect(
      () => new ContractProcedure({ ...ping['~orpc'], route: { successStatus: 100 } }),
    ).toThrowError()
    expect(
      () => new ContractProcedure({ ...ping['~orpc'], route: { successStatus: 300 } }),
    ).toThrowError()
    expect(
      () => new ContractProcedure({ ...ping['~orpc'], route: { successStatus: 299 } }),
    ).not.toThrowError()
  })

  it('throws error when errorMap has invalid status code', () => {
    expect(
      () => new ContractProcedure({
        ...ping['~orpc'],
        errorMap: { BAD_GATEWAY: { status: 100 } },
      }),
    ).toThrowError()
    expect(
      () => new ContractProcedure({
        ...ping['~orpc'],
        errorMap: {
          BAD_GATEWAY: { status: 600 },
        },
      }),
    ).toThrowError()
  })
})

describe('isContractProcedure', () => {
  it('works', () => {
    expect(ping).toSatisfy(isContractProcedure)
    expect(pong).toSatisfy(isContractProcedure)
    expect({}).not.toSatisfy(isContractProcedure)
    expect(true).not.toSatisfy(isContractProcedure)
    expect(1).not.toSatisfy(isContractProcedure)
    expect({ '~orpc': {} }).not.toSatisfy(isContractProcedure)
  })

  it('works with raw object', () => {
    expect(Object.assign({}, ping)).toSatisfy(isContractProcedure)
    expect(Object.assign({}, pong)).toSatisfy(isContractProcedure)
  })
})
