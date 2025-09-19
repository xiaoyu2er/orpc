import type { DurableIteratorTokenPayload } from '../schemas'
import { createCloudflareWebsocket, createDurableObjectState } from '../../tests/shared'
import { DurableIteratorObjectHandler } from './handler'
import { toDurableIteratorWebsocket } from './websocket'

beforeAll(() => {
  (globalThis as any).WebSocketPair = vi.fn(() => ({
    0: createCloudflareWebsocket(),
    1: createCloudflareWebsocket(),
  }))

  const globalResponse = globalThis.Response

  ;(globalThis as any).Response = class extends globalResponse {
    readonly __init: any

    constructor(input: any, init?: any) {
      super(input, {
        ...init,
        status: 200, // avoid invalid status error
      })

      this.__init = init
    }
  }

  afterAll(() => {
    ; (globalThis as any).WebSocketPair = undefined
    ; (globalThis as any).Response = globalResponse
  })
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('durableIteratorObjectHandler', async () => {
  const ctx = createDurableObjectState()
  const object = {
    method: vi.fn(),
  }
  const interceptor = vi.fn(({ next }) => next())

  const handler = new DurableIteratorObjectHandler(ctx, object, {
    interceptors: [interceptor],
  })

  const resumeStoreStoreSpy = vi.spyOn((handler as any).resumeStorage, 'store')
  const resumeStoreGetSpy = vi.spyOn((handler as any).resumeStorage, 'get')

  const baseTokenPayload: DurableIteratorTokenPayload = {
    chn: 'channel',
    id: 'id',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    att: 'att',
    rpc: ['method'],
  }

  it('auto close expired websockets on init', async () => {
    const wsNormal = createCloudflareWebsocket()
    toDurableIteratorWebsocket(wsNormal)['~orpc'].serializeTokenPayload(baseTokenPayload)
    const wsExpired = createCloudflareWebsocket()
    toDurableIteratorWebsocket(wsExpired)['~orpc'].serializeTokenPayload({ ...baseTokenPayload, exp: Math.floor(Date.now() / 1000) - 3600 })

    ctx.getWebSockets.mockReturnValue([wsNormal, wsExpired])
    void new DurableIteratorObjectHandler(ctx, object)

    expect(wsNormal.close).toHaveBeenCalledTimes(0)
    expect(wsExpired.close).toHaveBeenCalledTimes(1)
  })

  describe('publishEvent', () => {
    const ws1 = toDurableIteratorWebsocket(createCloudflareWebsocket())
    ws1['~orpc'].serializeTokenPayload({ ...baseTokenPayload, id: 'ws-1' })
    ws1['~orpc'].serializeHibernationId('1')

    const ws2 = toDurableIteratorWebsocket(createCloudflareWebsocket())
    ws2['~orpc'].serializeTokenPayload({ ...baseTokenPayload, id: 'ws-2' })
    ws2['~orpc'].serializeHibernationId('1')

    it('works', async () => {
      const wsMissingHibernationId = toDurableIteratorWebsocket(createCloudflareWebsocket())
      wsMissingHibernationId['~orpc'].serializeTokenPayload({ ...baseTokenPayload, id: 'wsMissingHibernationId' })

      ctx.getWebSockets.mockReturnValue([ws1, ws2, wsMissingHibernationId])

      resumeStoreStoreSpy.mockReturnValue({ order: '__fromResumeStore__' })
      handler.publishEvent({ order: 1 })

      expect(ws1['~orpc'].original.send).toHaveBeenCalledTimes(1)
      expect(ws2['~orpc'].original.send).toHaveBeenCalledTimes(1)
      expect(wsMissingHibernationId['~orpc'].original.send).toHaveBeenCalledTimes(0)

      expect(resumeStoreStoreSpy).toHaveBeenCalledTimes(1)
      expect(resumeStoreStoreSpy).toHaveBeenCalledWith({ order: 1 }, {})

      // send result from resume store
      expect((ws1 as any)['~orpc'].original.send.mock.calls[0][0]).toContain(JSON.stringify({ order: '__fromResumeStore__' }))
      expect((ws2 as any)['~orpc'].original.send.mock.calls[0][0]).toContain(JSON.stringify({ order: '__fromResumeStore__' }))
    })

    it('targets, exclude options', async () => {
      ctx.getWebSockets.mockReturnValue([ws1, ws2])

      handler.publishEvent({ order: 1 }, { targets: [ws1] })

      expect(ws1['~orpc'].original.send).toHaveBeenCalledTimes(1)
      expect(ws2['~orpc'].original.send).toHaveBeenCalledTimes(0)
      expect(resumeStoreStoreSpy).toHaveBeenCalledTimes(1)
      expect(resumeStoreStoreSpy).toHaveBeenCalledWith({ order: 1 }, { targets: [ws1] })

      vi.clearAllMocks()
      handler.publishEvent({ order: 2 }, { exclude: [ws1] })

      expect(ws1['~orpc'].original.send).toHaveBeenCalledTimes(0)
      expect(ws2['~orpc'].original.send).toHaveBeenCalledTimes(1)
      expect(resumeStoreStoreSpy).toHaveBeenCalledTimes(1)
      expect(resumeStoreStoreSpy).toHaveBeenCalledWith({ order: 2 }, { exclude: [ws1] })

      vi.clearAllMocks()
      handler.publishEvent({ order: 3 }, { targets: [ws1], exclude: [ws2] })

      expect(ws1['~orpc'].original.send).toHaveBeenCalledTimes(1)
      expect(ws2['~orpc'].original.send).toHaveBeenCalledTimes(0)
      expect(resumeStoreStoreSpy).toHaveBeenCalledTimes(1)
      expect(resumeStoreStoreSpy).toHaveBeenCalledWith({ order: 3 }, { targets: [ws1], exclude: [ws2] })
    })

    it('ignore sending errors', async () => {
      ctx.getWebSockets.mockReturnValue([ws1, ws2])

      vi.mocked(ws1['~orpc'].original.send).mockImplementationOnce(() => {
        throw new Error('error')
      })

      handler.publishEvent({ order: 1 })

      expect(ws1['~orpc'].original.send).toHaveBeenCalledTimes(1)
      expect(ws2['~orpc'].original.send).toHaveBeenCalledTimes(1)
    })
  })
})
