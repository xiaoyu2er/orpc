import * as ServerFetch from '@orpc/server/fetch'
import { StandardHandler } from '@orpc/server/standard'
import { describe, expect, it, vi } from 'vitest'
import { router } from '../../../../server/tests/shared'
import { OpenAPICodec, OpenAPIMatcher } from '../standard'
import { OpenAPIHandler } from './openapi-handler'

const fetchRequestToStandardRequestSpy = vi.spyOn(ServerFetch, 'fetchRequestToStandardRequest')
const standardResponseToFetchResponseSpy = vi.spyOn(ServerFetch, 'standardResponseToFetchResponse')

vi.mock('@orpc/server/standard', async origin => ({
  ...await origin(),
  StandardHandler: vi.fn(),
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

    const result = await handler.handle(request, { prefix: '/api/v1', context: { db: 'postgres' } })

    expect(result).toEqual({
      matched: true,
      response: standardResponseToFetchResponseSpy.mock.results[0]!.value,
    })

    expect(handle).toHaveBeenCalledOnce()
    expect(handle).toHaveBeenCalledWith(
      fetchRequestToStandardRequestSpy.mock.results[0]!.value,
      { prefix: '/api/v1', context: { db: 'postgres' } },
    )

    expect(fetchRequestToStandardRequestSpy).toHaveBeenCalledOnce()
    expect(fetchRequestToStandardRequestSpy).toHaveBeenCalledWith(request)

    expect(standardResponseToFetchResponseSpy).toHaveBeenCalledOnce()
    expect(standardResponseToFetchResponseSpy).toHaveBeenCalledWith({
      status: 200,
      headers: {},
      body: '__body__',
    })
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
      fetchRequestToStandardRequestSpy.mock.results[0]!.value,
      { prefix: '/api/v1', context: { db: 'postgres' } },
    )

    expect(fetchRequestToStandardRequestSpy).toHaveBeenCalledOnce()
    expect(fetchRequestToStandardRequestSpy).toHaveBeenCalledWith(request)

    expect(standardResponseToFetchResponseSpy).not.toHaveBeenCalled()
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
