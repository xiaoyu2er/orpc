import { ping } from '../tests/shared'
import { createProcedureClient } from './procedure-client'
import { call } from './procedure-utils'

vi.mock('./procedure-client', async original => ({
  ...await original(),
  createProcedureClient: vi.fn(() => vi.fn()),
}))

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
