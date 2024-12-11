import { createProcedureClient } from './procedure'
import { createRouterClient } from './router'

vi.mock('./procedure', () => ({
  createProcedureClient: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('router client', () => {
  const procedureClient = vi.fn().mockReturnValue('__mocked__')
  vi.mocked(createProcedureClient).mockReturnValue(procedureClient)

  it('works', async () => {
    const client = createRouterClient({
      baseURL: 'http://localhost:3000/orpc',
    }) as any

    vi.clearAllMocks()
    const o1 = await client.ping({ value: 'hello' })

    expect(o1).toEqual('__mocked__')
    expect(createProcedureClient).toBeCalledTimes(1)
    expect(createProcedureClient).toBeCalledWith({
      baseURL: 'http://localhost:3000/orpc',
      path: ['ping'],
    })

    vi.clearAllMocks()
    const o2 = await client.nested.pong({ value: 'hello' })

    expect(o2).toEqual('__mocked__')
    expect(createProcedureClient).toBeCalledTimes(2)
    expect(createProcedureClient).toBeCalledWith({
      baseURL: 'http://localhost:3000/orpc',
      path: ['nested', 'pong'],
    })
  })

  it('works with options', async () => {
    const headers = vi.fn()
    const fetch = vi.fn()
    const client = createRouterClient({
      baseURL: 'http://localhost:3000/orpc',
      path: ['base'],
      headers,
      fetch,
    }) as any

    vi.clearAllMocks()
    await client.ping({ value: 'hello' })

    expect(createProcedureClient).toBeCalledTimes(1)
    expect(createProcedureClient).toBeCalledWith({
      baseURL: 'http://localhost:3000/orpc',
      path: ['base', 'ping'],
      headers,
      fetch,
    })
  })
})
