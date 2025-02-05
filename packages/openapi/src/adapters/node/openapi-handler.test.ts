import { nodeHttpResponseSendStandardResponse, nodeHttpToStandardRequest } from '@orpc/server/node'
import { StandardHandler } from '@orpc/server/standard'
import inject from 'light-my-request'
import { router } from '../../../../server/tests/shared'
import { OpenAPICodec, OpenAPIMatcher } from '../standard'
import { OpenAPIHandler } from './openapi-handler'

vi.mock('@orpc/server/node', () => ({
  nodeHttpToStandardRequest: vi.fn(),
  nodeHttpResponseSendStandardResponse: vi.fn(),
}))

vi.mock('@orpc/server/standard', async origin => ({
  ...await origin(),
  StandardHandler: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('openapiHandler', async () => {
  const handle = vi.fn()

  vi.mocked(StandardHandler).mockReturnValue({
    handle,
  } as any)

  const handler = new OpenAPIHandler(router)

  let req: any, res: any

  await inject((_req, _res) => {
    req = _req
    res = _res
    _res.end()
  }, {
    url: '/',
  })

  const standardRequest = {
    raw: {},
    method: 'POST',
    url: new URL('https://example.com/api/v1/users/1'),
    headers: {
      'content-type': 'application/json',
      'content-length': '12',
    },
    body: () => Promise.resolve(JSON.stringify({ name: 'John Doe' })),
  }

  it('on match', async () => {
    vi.mocked(nodeHttpToStandardRequest).mockReturnValueOnce(standardRequest)
    handle.mockReturnValueOnce({
      matched: true,
      response: {
        status: 200,
        headers: {},
        body: '__body__',
      },
    })

    const result = await handler.handle(req, res, { prefix: '/api/v1', context: { db: 'postgres' } })

    expect(result).toEqual({
      matched: true,
    })

    expect(handle).toHaveBeenCalledOnce()
    expect(handle).toHaveBeenCalledWith(
      standardRequest,
      { prefix: '/api/v1', context: { db: 'postgres' } },
    )

    expect(nodeHttpToStandardRequest).toHaveBeenCalledOnce()
    expect(nodeHttpToStandardRequest).toHaveBeenCalledWith(req, res)

    expect(nodeHttpResponseSendStandardResponse).toHaveBeenCalledOnce()
    expect(nodeHttpResponseSendStandardResponse).toHaveBeenCalledWith(res, {
      status: 200,
      headers: {},
      body: '__body__',
    })
  })

  it('on mismatch', async () => {
    vi.mocked(nodeHttpToStandardRequest).mockReturnValueOnce(standardRequest)
    handle.mockReturnValueOnce({
      matched: false,
      response: undefined,
    })

    const result = await handler.handle(req, res, { prefix: '/api/v1', context: { db: 'postgres' } })

    expect(result).toEqual({
      matched: false,
      response: undefined,
    })

    expect(handle).toHaveBeenCalledOnce()
    expect(handle).toHaveBeenCalledWith(
      standardRequest,
      { prefix: '/api/v1', context: { db: 'postgres' } },
    )

    expect(nodeHttpToStandardRequest).toHaveBeenCalledOnce()
    expect(nodeHttpToStandardRequest).toHaveBeenCalledWith(req, res)

    expect(nodeHttpResponseSendStandardResponse).not.toHaveBeenCalled()
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
