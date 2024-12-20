import { createProcedureFetchClient } from './procedure-fetch-client'
import { createRouterFetchClient } from './router-fetch-client'

vi.mock('./procedure-fetch-client', () => ({
  createProcedureFetchClient: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('router fetch client', () => {
  const procedureClient = vi.fn().mockReturnValue('__mocked__')
  vi.mocked(createProcedureFetchClient).mockReturnValue(procedureClient)

  it('works', async () => {
    const client = createRouterFetchClient({
      baseURL: 'http://localhost:3000/orpc',
    }) as any

    vi.clearAllMocks()
    const o1 = await client.ping({ value: 'hello' })

    expect(o1).toEqual('__mocked__')
    expect(createProcedureFetchClient).toBeCalledTimes(1)
    expect(createProcedureFetchClient).toBeCalledWith({
      baseURL: 'http://localhost:3000/orpc',
      path: ['ping'],
    })

    vi.clearAllMocks()
    const o2 = await client.nested.pong({ value: 'hello' })

    expect(o2).toEqual('__mocked__')
    expect(createProcedureFetchClient).toBeCalledTimes(2)
    expect(createProcedureFetchClient).toBeCalledWith({
      baseURL: 'http://localhost:3000/orpc',
      path: ['nested', 'pong'],
    })
  })

  it('works with options', async () => {
    const headers = vi.fn()
    const fetch = vi.fn()
    const client = createRouterFetchClient({
      baseURL: 'http://localhost:3000/orpc',
      path: ['base'],
      headers,
      fetch,
    }) as any

    vi.clearAllMocks()
    await client.ping({ value: 'hello' })

    expect(createProcedureFetchClient).toBeCalledTimes(1)
    expect(createProcedureFetchClient).toBeCalledWith({
      baseURL: 'http://localhost:3000/orpc',
      path: ['base', 'ping'],
      headers,
      fetch,
    })
  })

  it('not recursive on symbol', async () => {
    const client = createRouterFetchClient({
      baseURL: 'http://localhost:3000/orpc',
    }) as any

    expect(client[Symbol('test')]).toBeUndefined()
  })
})
