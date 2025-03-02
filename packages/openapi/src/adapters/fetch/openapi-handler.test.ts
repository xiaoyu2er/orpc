import { StandardHandler } from '@orpc/server/standard'
import { toFetchResponse, toStandardLazyRequest } from '@orpc/standard-server-fetch'
import { describe, expect, it, vi } from 'vitest'
import { router } from '../../../../server/tests/shared'
import { OpenAPICodec, OpenAPIMatcher } from '../standard'
import { OpenAPIHandler } from './openapi-handler'

vi.mock('@orpc/server/standard', async origin => ({
  ...await origin(),
  StandardHandler: vi.fn(),
}))

vi.mock('@orpc/standard-server-fetch', async origin => ({
  toStandardRequest: vi.fn((await origin() as any).toStandardRequest),
  toFetchResponse: vi.fn((await origin() as any).toFetchResponse),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('openAPIHandler', () => {
  const handle = vi.fn()

  vi.mocked(StandardHandler).mockReturnValue({
    handle,
  } as any)

  const handler = new OpenAPIHandler(router)

  const request = new Request('https://example.com/api/v1/users/1', {
    headers: new Headers({ 'content-type': 'application/json' }),
    method: 'POST',
    body: JSON.stringify({ data: { value: '123' }, meta: [] }),
  })

  it('on match', async () => {
    handle.mockReturnValueOnce({
      matched: true,
      response: {
        status: 200,
        headers: {},
        body: '__body__',
      },
    })

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
      codec: new OpenAPICodec(),
      matcher: new OpenAPIMatcher(),
      interceptors: [vi.fn()],
    }

    const handler = new OpenAPIHandler(router, options)

    expect(StandardHandler).toHaveBeenCalledOnce()
    expect(StandardHandler).toHaveBeenCalledWith(
      router,
      options.matcher,
      options.codec,
      options,
    )
  })
})
