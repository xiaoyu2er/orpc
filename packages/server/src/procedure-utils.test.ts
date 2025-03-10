import { ContractProcedure } from '@orpc/contract'
import { z } from 'zod'
import { contract, ping } from '../tests/shared'
import { Procedure } from './procedure'
import { createProcedureClient } from './procedure-client'
import { call, createContractedProcedure } from './procedure-utils'

vi.mock('./procedure-client', async original => ({
  ...await original(),
  createProcedureClient: vi.fn(() => vi.fn()),
}))

it('createContractedProcedure', () => {
  const mismatchPath = {
    errorMap: {
      MISMATCH_HERE: {},
    },
    meta: {
      MISMATCH_HERE: {},
    },
    route: {
      path: '/MISMATCH_HERE',
    },
  } as const

  const contracted = createContractedProcedure(ping, new ContractProcedure({
    ...contract.ping['~orpc'],
    ...mismatchPath,
    inputSchema: z.object({}), // this will be ignored
  }))

  expect(contracted).toBeInstanceOf(Procedure)
  expect(contracted['~orpc']).toEqual({
    ...ping['~orpc'],
    ...mismatchPath,
  })
})

it('call', async () => {
  const client = vi.fn(async () => '__output__')
  vi.mocked(createProcedureClient).mockReturnValueOnce(client)

  const options = { context: { db: 'postgres' } }
  const output = await call(ping, { input: 123 }, options)

  expect(output).toBe('__output__')
  expect(createProcedureClient).toBeCalledTimes(1)
  expect(createProcedureClient).toBeCalledWith(ping, options)
  expect(client).toBeCalledTimes(1)
  expect(client).toBeCalledWith({ input: 123 })
})
