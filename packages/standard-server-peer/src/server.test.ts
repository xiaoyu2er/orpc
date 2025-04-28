import { isAsyncIteratorObject } from '@orpc/shared'
import { getEventMeta, withEventMeta } from '@orpc/standard-server'
import { decodeResponseMessage, encodeRequestMessage, encodeResponseMessage, MessageType } from './codec'
import { ServerPeer } from './server'

describe('serverPeer', () => {
  const baseRequest = {
    url: new URL('https://example.com'),
    method: 'POST',
    headers: {
      'x-request': '1',
    },
    body: { hello: 'world' },
    signal: undefined,
  }

  const baseResponse = {
    status: 200,
    headers: {
      'x-response': '1',
    },
    body: { hello: 'world_2' },
  }

  it('simple request/response', async () => {
    const send = vi.fn()
    const peer = new ServerPeer(send)

    const [id, request] = await peer.message(await encodeRequestMessage(0, MessageType.REQUEST, baseRequest))

    expect(id).toBe(0)
    expect(request).toEqual({
      ...baseRequest,
      signal: expect.any(AbortSignal),
    })

    peer.response(id, baseResponse)

    await peer.message(await encodeResponseMessage(0, MessageType.RESPONSE, baseResponse))

    expect(send).toHaveBeenCalledTimes(1)
    expect(await decodeResponseMessage(send.mock.calls[0]![0])).toEqual([0, MessageType.RESPONSE, baseResponse])
  })

  describe('request', () => {
    it('signal', async () => {
      const send = vi.fn()
      const peer = new ServerPeer(send)

      const [, request] = await peer.message(await encodeRequestMessage(0, MessageType.REQUEST, baseRequest))

      const signal = request!.signal!

      expect(signal.aborted).toBe(false)

      await peer.message(await encodeRequestMessage(0, MessageType.ABORT_SIGNAL, undefined))
      await new Promise(resolve => setTimeout(resolve, 1))

      expect(signal.aborted).toBe(true)
    })

    it('iterator', async () => {
      const send = vi.fn()
      const peer = new ServerPeer(send)

      const clientRequest = {
        ...baseRequest,
        body: (async function* () {})(),
      }

      const [, request] = await peer.message(await encodeRequestMessage(0, MessageType.REQUEST, clientRequest))
      await peer.message(await encodeRequestMessage(0, MessageType.EVENT_ITERATOR, { event: 'message', data: 'hello' }))
      await peer.message(await encodeRequestMessage(0, MessageType.EVENT_ITERATOR, { event: 'message', data: { hello2: true }, meta: { id: 'id-1' } }))
      await peer.message(await encodeRequestMessage(0, MessageType.EVENT_ITERATOR, { event: 'done', data: 'hello3' }))

      expect(request).toEqual({
        ...clientRequest,
        headers: {
          ...clientRequest.headers,
          'content-type': 'text/event-stream',
        },
        body: expect.toSatisfy(isAsyncIteratorObject),
        signal: expect.any(AbortSignal),
      })

      const iterator = request!.body as AsyncGenerator

      await expect(iterator.next()).resolves.toSatisfy(({ done, value }) => {
        expect(done).toBe(false)
        expect(value).toEqual('hello')

        return true
      })

      await expect(iterator.next()).resolves.toSatisfy(({ done, value }) => {
        expect(done).toBe(false)
        expect(value).toEqual({ hello2: true })
        expect(getEventMeta(value)).toEqual({ id: 'id-1' })

        return true
      })

      // TODO: remove await
      await expect(iterator.next()).resolves.toSatisfy(({ done, value }) => {
        expect(done).toBe(true)
        expect(value).toEqual('hello3')

        return true
      })

      expect(iterator.next()).resolves.toEqual({ done: true, value: undefined })
    })

    it('iterator with manually .return', async () => {
      const send = vi.fn()
      const peer = new ServerPeer(send)

      const clientRequest = {
        ...baseRequest,
        body: (async function* () { })(),
      }

      const [, request] = await peer.message(await encodeRequestMessage(0, MessageType.REQUEST, clientRequest))
      await peer.message(await encodeRequestMessage(0, MessageType.EVENT_ITERATOR, { event: 'message', data: 'hello' }))

      expect(request).toEqual({
        ...clientRequest,
        headers: {
          ...clientRequest.headers,
          'content-type': 'text/event-stream',
        },
        body: expect.toSatisfy(isAsyncIteratorObject),
        signal: expect.any(AbortSignal),
      })

      const iterator = request!.body as AsyncGenerator

      await expect(iterator.next()).resolves.toSatisfy(({ done, value }) => {
        expect(done).toBe(false)
        expect(value).toEqual('hello')

        return true
      })

      await expect(iterator.return(undefined)).resolves.toEqual({ done: true, value: undefined })
      await expect(iterator.next(undefined)).resolves.toEqual({ done: true, value: undefined })

      expect(send).toHaveBeenCalledTimes(1)
      expect(await decodeResponseMessage(send.mock.calls[0]![0])).toEqual([0, MessageType.ABORT_SIGNAL, undefined])
    })

    it('file', async () => {
      const send = vi.fn()
      const peer = new ServerPeer(send)

      const clientRequest = {
        ...baseRequest,
        body: new File(['hello'], 'hello.txt', { type: 'text/plain' }),
      }

      const [id, request] = await peer.message(await encodeRequestMessage(90, MessageType.REQUEST, clientRequest))

      expect(id).toBe(90)
      expect(request).toEqual({
        ...clientRequest,
        headers: {
          ...clientRequest.headers,
          'content-type': 'text/plain',
          'content-disposition': expect.any(String),
        },
        signal: expect.any(AbortSignal),
      })
    })

    it('form data', async () => {
      const send = vi.fn()
      const peer = new ServerPeer(send)

      const formData = new FormData()
      formData.append('hello', 'world')
      formData.append('file', new File(['hello'], 'hello.txt', { type: 'text/plain' }))

      const clientRequest = {
        ...baseRequest,
        body: formData,
      }

      const [id, request] = await peer.message(await encodeRequestMessage(99, MessageType.REQUEST, clientRequest))

      expect(id).toBe(99)
      expect(request).toEqual({
        ...clientRequest,
        headers: {
          ...clientRequest.headers,
          'content-type': expect.stringMatching(/^multipart\/form-data; boundary=/),
        },
        signal: expect.any(AbortSignal),
      })
    })
  })

  describe('response', () => {
    it('iterator', async () => {
      const send = vi.fn()
      const peer = new ServerPeer(send)

      await peer.message(await encodeRequestMessage(0, MessageType.REQUEST, baseRequest))

      await peer.response(0, {
        ...baseResponse,
        body: (async function* () {
          yield 'hello'
          yield withEventMeta({ hello2: true }, { id: 'id-1' })
          return withEventMeta({ hello3: true }, { retry: 2000 })
        })(),
      })

      await new Promise(resolve => setTimeout(resolve, 0))

      expect(send).toHaveBeenCalledTimes(4)
      expect(await decodeResponseMessage(send.mock.calls[0]![0])).toEqual([0, MessageType.RESPONSE, {
        ...baseResponse,
        headers: {
          ...baseResponse.headers,
          'content-type': 'text/event-stream',
        },
        body: undefined,
      }])
      expect(await decodeResponseMessage(send.mock.calls[1]![0]))
        .toEqual([0, MessageType.EVENT_ITERATOR, { event: 'message', data: 'hello' }])
      expect(await decodeResponseMessage(send.mock.calls[2]![0]))
        .toEqual([0, MessageType.EVENT_ITERATOR, { event: 'message', data: { hello2: true }, meta: { id: 'id-1' } }])
      expect(await decodeResponseMessage(send.mock.calls[3]![0]))
        .toEqual([0, MessageType.EVENT_ITERATOR, { event: 'done', data: { hello3: true }, meta: { retry: 2000 } }])
    })

    it('iterator with abort signal while sending', async () => {
      const send = vi.fn()
      const peer = new ServerPeer(send)

      await peer.message(await encodeRequestMessage(0, MessageType.REQUEST, baseRequest))

      const yieldFn = vi.fn(v => v)
      let isFinallyCalled = false

      await peer.response(0, {
        ...baseResponse,
        body: (async function* () {
          try {
            yield yieldFn('hello')
            await new Promise(resolve => setTimeout(resolve, 100))
            yield yieldFn('hello2')
            yield yieldFn('hello3')
          }
          finally {
            isFinallyCalled = true
          }
        })(),
      })

      await new Promise(resolve => setTimeout(resolve, 0))

      expect(send).toHaveBeenCalledTimes(2)

      await peer.message(await encodeRequestMessage(0, MessageType.ABORT_SIGNAL, undefined))

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(send).toHaveBeenCalledTimes(2)

      expect(await decodeResponseMessage(send.mock.calls[0]![0])).toEqual([0, MessageType.RESPONSE, {
        ...baseResponse,
        headers: {
          ...baseResponse.headers,
          'content-type': 'text/event-stream',
        },
        body: undefined,
      }])
      expect(await decodeResponseMessage(send.mock.calls[1]![0]))
        .toEqual([0, MessageType.EVENT_ITERATOR, { event: 'message', data: 'hello' }])

      expect(yieldFn).toHaveBeenCalledTimes(2)
      expect(isFinallyCalled).toBe(true)
    })

    it('file', async () => {
      const send = vi.fn()
      const peer = new ServerPeer(send)
      const file = new File(['hello'], 'hello.txt', { type: 'text/plain' })

      await peer.message(await encodeRequestMessage(90, MessageType.REQUEST, baseRequest))

      await peer.response(90, {
        ...baseResponse,
        body: file,
      })

      await new Promise(resolve => setTimeout(resolve, 0))

      expect(send).toHaveBeenCalledTimes(1)
      expect(await decodeResponseMessage(send.mock.calls[0]![0])).toEqual([90, MessageType.RESPONSE, {
        ...baseResponse,
        headers: {
          ...baseResponse.headers,
          'content-type': 'text/plain',
          'content-disposition': expect.any(String),
        },
        body: file,
      }])
    })

    it('form data', async () => {
      const send = vi.fn()
      const peer = new ServerPeer(send)

      const formData = new FormData()
      formData.append('hello', 'world')
      formData.append('file', new File(['hello'], 'hello.txt', { type: 'text/plain' }))

      const clientRequest = {
        ...baseRequest,
        body: formData,
      }

      await peer.message(await encodeRequestMessage(99, MessageType.REQUEST, baseRequest))

      await peer.response(99, {
        ...baseResponse,
        body: formData,
      })

      await new Promise(resolve => setTimeout(resolve, 0))

      expect(send).toHaveBeenCalledTimes(1)
      expect(await decodeResponseMessage(send.mock.calls[0]![0])).toEqual([99, MessageType.RESPONSE, {
        ...baseResponse,
        headers: {
          ...baseResponse.headers,
          'content-type': expect.stringMatching(/^multipart\/form-data; boundary=/),
        },
        body: formData,
      }])
    })

    it('close if can not send', async () => {
      const send = vi.fn(() => {
        throw new Error('send error')
      })
      const peer = new ServerPeer(send)

      const [, request] = await peer.message(await encodeRequestMessage(0, MessageType.REQUEST, baseRequest))
      await peer.response(0, baseResponse)
      await new Promise(resolve => setTimeout(resolve, 1))
      await peer.message(await encodeResponseMessage(0, MessageType.ABORT_SIGNAL, undefined))
      await new Promise(resolve => setTimeout(resolve, 1))

      expect(send).toHaveBeenCalledTimes(1)
      expect(request!.signal!.aborted).toBe(false)
    })

    it('close if cannot send signal', async () => {
      const send = vi.fn(() => {
        throw new Error('send error')
      })
      const peer = new ServerPeer(send)

      const [, request] = await peer.message(await encodeRequestMessage(0, MessageType.REQUEST, {
        ...baseRequest,
        body: (async function* () {})(),
      }))
      await peer.message(await encodeRequestMessage(0, MessageType.EVENT_ITERATOR, { event: 'message', data: 'hello' }))
      await new Promise(resolve => setTimeout(resolve, 1))
      await (request as any).body.return()
      await peer.message(await encodeRequestMessage(0, MessageType.ABORT_SIGNAL, undefined))
      await new Promise(resolve => setTimeout(resolve, 1))

      expect(send).toHaveBeenCalledTimes(1)
      expect(request!.signal!.aborted).toBe(false)
    })

    it('close if cannot send iterator', async () => {
      let time = 0
      const send = vi.fn(() => {
        if (time++ === 1) {
          throw new Error('send error')
        }
      })
      const peer = new ServerPeer(send)

      const [, request] = await peer.message(await encodeRequestMessage(0, MessageType.REQUEST, baseRequest))
      await new Promise(resolve => setTimeout(resolve, 10))

      const yieldFn = vi.fn(v => v)
      let isFinallyCalled = false

      await peer.response(0, {
        ...baseResponse,
        body: (async function* () {
          try {
            yield yieldFn('hello')
            await new Promise(resolve => setTimeout(resolve, 50))
            yield yieldFn('hello2')
            yield yieldFn('hello3')
          }
          finally {
            isFinallyCalled = true
          }
        })(),
      })
      await new Promise(resolve => setTimeout(resolve, 1))
      await peer.message(await encodeRequestMessage(0, MessageType.ABORT_SIGNAL, undefined))
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(send).toHaveBeenCalledTimes(2)
      expect(request!.signal!.aborted).toBe(false)
      expect(yieldFn).toHaveBeenCalledTimes(2)
      expect(isFinallyCalled).toBe(true)
    })
  })

  it('close all', async () => {
    const send = vi.fn()
    const peer = new ServerPeer(send)

    const [, request] = await peer.message(await encodeRequestMessage(0, MessageType.REQUEST, baseRequest))

    peer.close()

    await peer.message(await encodeRequestMessage(0, MessageType.ABORT_SIGNAL, undefined))
    await new Promise(resolve => setTimeout(resolve, 1))

    expect(request!.signal!.aborted).toBe(false)
  })
})
