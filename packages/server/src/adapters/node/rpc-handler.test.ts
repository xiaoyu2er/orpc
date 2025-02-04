import { describe, expect, it, vi } from 'vitest'
import { router } from '../../../tests/shared'
import { RPCCodec, RPCMatcher, StandardHandler } from '../standard'
import { RPCHandler } from './rpc-handler'
import * as Utils from './utils'

const nodeHttpToStandardRequestSpy = vi.spyOn(Utils, 'nodeHttpToStandardRequest')
const nodeHttpResponseSendStandardResponseSpy = vi.spyOn(Utils, 'nodeHttpResponseSendStandardResponse')

vi.mock('../standard', async origin => ({
  ...await origin(),
  StandardHandler: vi.fn(),
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

  const req = { IncomingMessage: true } as any
  const res = { ServerResponse: true } as any

  it('on match', async () => {
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
      nodeHttpToStandardRequestSpy.mock.results[0]!.value,
      { prefix: '/api/v1', context: { db: 'postgres' } },
    )

    expect(nodeHttpToStandardRequestSpy).toHaveBeenCalledOnce()
    expect(nodeHttpToStandardRequestSpy).toHaveBeenCalledWith(req, res)

    expect(nodeHttpResponseSendStandardResponseSpy).toHaveBeenCalledOnce()
    expect(nodeHttpResponseSendStandardResponseSpy).toHaveBeenCalledWith(res, {
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

    const result = await handler.handle(req, res, { prefix: '/api/v1', context: { db: 'postgres' } })

    expect(result).toEqual({
      matched: false,
      response: undefined,
    })

    expect(handle).toHaveBeenCalledOnce()
    expect(handle).toHaveBeenCalledWith(
      nodeHttpToStandardRequestSpy.mock.results[0]!.value,
      { prefix: '/api/v1', context: { db: 'postgres' } },
    )

    expect(nodeHttpToStandardRequestSpy).toHaveBeenCalledOnce()
    expect(nodeHttpToStandardRequestSpy).toHaveBeenCalledWith(req, res)

    expect(nodeHttpResponseSendStandardResponseSpy).not.toHaveBeenCalled()
  })

  it('standardHandler constructor', async () => {
    const options = {
      codec: new RPCCodec(),
      matcher: new RPCMatcher(),
      interceptors: [vi.fn()],
    }

    const handler = new RPCHandler(router, options)

    expect(StandardHandler).toHaveBeenCalledOnce()
    expect(StandardHandler).toHaveBeenCalledWith(
      router,
      options,
    )
  })
})
