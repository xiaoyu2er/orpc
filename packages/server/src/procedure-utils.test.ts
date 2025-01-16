import { ContractProcedure } from '@orpc/contract'
import { Procedure } from './procedure'
import { createProcedureClient } from './procedure-client'
import { call } from './procedure-utils'

vi.mock('./procedure-client', async original => ({
  ...await original(),
  createProcedureClient: vi.fn(() => vi.fn()),
}))

const procedure = new Procedure({
  contract: new ContractProcedure({
    InputSchema: undefined,
    OutputSchema: undefined,
    errorMap: {},
  }),
  handler: () => { },
  middlewares: [],
  inputValidationIndex: 0,
  outputValidationIndex: 0,
})

describe('call', () => {
  it('works', async () => {
    const client = vi.fn(async () => '__output__')
    vi.mocked(createProcedureClient).mockReturnValueOnce(client)

    const options = { context: { db: 'postgres' } }
    const output = await call(procedure, 'input', options)

    expect(output).toBe('__output__')
    expect(createProcedureClient).toBeCalledTimes(1)
    expect(createProcedureClient).toBeCalledWith(procedure, options)
    expect(client).toBeCalledTimes(1)
    expect(client).toBeCalledWith('input')
  })
})
