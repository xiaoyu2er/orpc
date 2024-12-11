import { ORPCDeserializer, ORPCSerializer } from '@orpc/transformer'
import { createProcedureClient } from './procedure'

vi.mock('@orpc/transformer', () => ({
  ORPCSerializer: vi.fn().mockReturnValue({ serialize: vi.fn() }),
  ORPCDeserializer: vi.fn().mockReturnValue({ deserialize: vi.fn() }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('procedure client', () => {
  const serialize = (ORPCSerializer as any)().serialize
  const deserialize = (ORPCDeserializer as any)().deserialize
  const response = new Response('output')
  const headers = new Headers({ 'Content-Type': 'application/json' })

  const fakeFetch = vi.fn()
  fakeFetch.mockReturnValue(response)
  serialize.mockReturnValue({ body: 'transformed_input', headers })
  deserialize.mockReturnValue('transformed_output')

  it('works', async () => {
    const client = createProcedureClient({
      baseURL: 'http://localhost:3000/orpc',
      path: ['ping'],
      fetch: fakeFetch,
    })

    const output = await client('input')

    expect(output).toBe('transformed_output')

    expect(serialize).toBeCalledTimes(1)
    expect(serialize).toBeCalledWith('input')

    expect(fakeFetch).toBeCalledTimes(1)
    expect(fakeFetch).toBeCalledWith('http://localhost:3000/orpc/ping', {
      method: 'POST',
      body: 'transformed_input',
      headers: expect.any(Headers),
    })

    expect(deserialize).toBeCalledTimes(1)
    expect(deserialize).toBeCalledWith(response)
  })

  it.each([
    async () => new Headers({ 'x-test': 'hello' }),
    async () => ({ 'x-test': 'hello' }),
  ])('works with headers', async (headers) => {
    const client = createProcedureClient({
      path: ['ping'],
      baseURL: 'http://localhost:3000/orpc',
      fetch: fakeFetch,
      headers,
    })

    await client({ value: 'hello' })

    expect(fakeFetch).toBeCalledWith('http://localhost:3000/orpc/ping', {
      method: 'POST',
      body: 'transformed_input',
      headers: expect.any(Headers),
    })

    expect(fakeFetch.mock.calls[0]![1].headers.get('x-test')).toBe('hello')
  })

  it('abort signal', async () => {
    const controller = new AbortController()
    const signal = controller.signal

    const client = createProcedureClient({
      path: ['ping'],
      baseURL: 'http://localhost:3000/orpc',
      fetch: fakeFetch,
    })

    await client(undefined, { signal })

    expect(fakeFetch).toBeCalledTimes(1)
    expect(fakeFetch.mock.calls[0]![1].signal).toBe(signal)
  })
})
