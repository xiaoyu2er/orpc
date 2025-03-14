import { RPCJsonSerializer, RPCSerializer } from '@orpc/client/standard'
import { toFetchResponse, toStandardLazyRequest } from '@orpc/standard-server-fetch'
import { router } from '../../../tests/shared'
import { StandardHandler, StandardRPCCodec, StandardRPCMatcher } from '../standard'
import { RPCHandler } from './rpc-handler'

vi.mock('../standard', async origin => ({
  ...await origin(),
  StandardHandler: vi.fn(),
}))

vi.mock('@orpc/standard-server-fetch', async origin => ({
  toStandardLazyRequest: vi.fn((await origin() as any).toStandardLazyRequest),
  toFetchResponse: vi.fn((await origin() as any).toFetchResponse),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('rpcHandler', () => {
  const handle = vi.fn()

  vi.mocked(StandardHandler).mockReturnValue({
    handle,
  } as any)

  const handler = new RPCHandler(router)

  const request = new Request('https://example.com/api/v1/users/1', {
    headers: new Headers({ 'content-type': 'application/json' }),
    method: 'POST',
    body: JSON.stringify({ data: { value: '123' }, meta: [] }),
  })

  it('on match', async () => {
    handle.mockReturnValueOnce({ matched: true, response: {
      status: 200,
      headers: {},
      body: '__body__',
    } })

    const options = { prefix: '/api/v1', context: { db: 'postgres' } } as const
    const result = await handler.handle(request, options)

    expect(result).toEqual({
      matched: true,
      response: vi.mocked(toFetchResponse).mock.results[0]!.value,
    })

    expect(handle).toHaveBeenCalledOnce()
    expect(handle).toHaveBeenCalledWith(
      vi.mocked(toStandardLazyRequest).mock.results[0]!.value,
      options,
    )

    expect(vi.mocked(toStandardLazyRequest)).toHaveBeenCalledOnce()
    expect(vi.mocked(toStandardLazyRequest)).toHaveBeenCalledWith(request)

    expect(vi.mocked(toFetchResponse)).toHaveBeenCalledOnce()
    expect(vi.mocked(toFetchResponse)).toHaveBeenCalledWith({
      status: 200,
      headers: {},
      body: '__body__',
    }, options)
  })

  it('on mismatch', async () => {
    handle.mockReturnValueOnce({
      matched: false,
      response: undefined,
    })

    const result = await handler.handle(request, { prefix: '/api/v1', context: { db: 'postgres' } })

    expect(result).toEqual({
      matched: false,
      response: undefined,
    })

    expect(handle).toHaveBeenCalledOnce()
    expect(handle).toHaveBeenCalledWith(
      vi.mocked(toStandardLazyRequest).mock.results[0]!.value,
      { prefix: '/api/v1', context: { db: 'postgres' } },
    )

    expect(vi.mocked(toStandardLazyRequest)).toHaveBeenCalledOnce()
    expect(vi.mocked(toStandardLazyRequest)).toHaveBeenCalledWith(request)

    expect(vi.mocked(toFetchResponse)).not.toHaveBeenCalled()
  })

  it('standardHandler constructor', async () => {
    const options = {
      codec: new StandardRPCCodec(new RPCSerializer(new RPCJsonSerializer())),
      matcher: new StandardRPCMatcher(),
      interceptors: [vi.fn()],
    }

    const handler = new RPCHandler(router, options)

    expect(StandardHandler).toHaveBeenCalledOnce()
    expect(StandardHandler).toHaveBeenCalledWith(
      router,
      options.matcher,
      options.codec,
      options,
    )
  })
})
