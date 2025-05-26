import type { StandardResponse } from '@orpc/standard-server'
import { Buffer } from 'node:buffer'
import Stream from 'node:stream'
import * as Body from './body'
import { sendStandardResponse } from './response'

const toLambdaBodySpy = vi.spyOn(Body, 'toLambdaBody')

beforeEach(() => {
  vi.clearAllMocks()

  globalThis.awslambda = {
    HttpResponseStream: {
      from: vi.fn(() => {
        const chunkes: any[] = []

        const stream = new Stream.Writable({
          write: (chunk, encoding, callback) => {
            chunkes.push(chunk)
            callback()
          },
        })

        ;(stream as any).chunkes = chunkes

        return stream
      }),
    },
  } as any
})

describe('sendStandardResponse', () => {
  it('chunked', async () => {
    const res: StandardResponse = {
      body: { value: 123 },
      headers: {
        'x-custom-header': 'custom-value',
        'set-cookie': ['foo=bar', 'bar=baz'],
      },
      status: 206,
    }

    const responseStream = new Stream.Writable()

    await sendStandardResponse(responseStream, res, { eventIteratorKeepAliveComment: 'test' })

    expect(toLambdaBodySpy).toBeCalledTimes(1)
    expect(toLambdaBodySpy).toBeCalledWith(res.body, res.headers, { eventIteratorKeepAliveComment: 'test' })

    expect(awslambda.HttpResponseStream.from).toBeCalledTimes(1)
    expect(awslambda.HttpResponseStream.from).toBeCalledWith(responseStream, {
      statusCode: res.status,
      headers: {
        'content-type': 'application/json',
        'x-custom-header': 'custom-value',
      },
      cookies: res.headers['set-cookie'],
    })

    expect(vi.mocked(awslambda.HttpResponseStream.from).mock.results[0]!.value.chunkes).toEqual([
      Buffer.from(JSON.stringify({ value: 123 })),
    ])

    expect(vi.mocked(awslambda.HttpResponseStream.from).mock.results[0]!.value.closed).toBe(true)
  })

  it('stream', async () => {
    const res: StandardResponse = {
      body: (async function* () {
        yield 'foo'
        yield 'bar'
      })(),
      headers: {
        'x-custom-header': 'custom-value',
        'set-cookie': ['foo=bar', 'bar=baz'],
      },
      status: 206,
    }

    const responseStream = new Stream.Writable()

    await sendStandardResponse(responseStream, res, { eventIteratorKeepAliveComment: 'test' })

    expect(toLambdaBodySpy).toBeCalledTimes(1)
    expect(toLambdaBodySpy).toBeCalledWith(res.body, res.headers, { eventIteratorKeepAliveComment: 'test' })

    expect(awslambda.HttpResponseStream.from).toBeCalledTimes(1)
    expect(awslambda.HttpResponseStream.from).toBeCalledWith(responseStream, {
      statusCode: res.status,
      headers: {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        'connection': 'keep-alive',
        'x-custom-header': 'custom-value',
      },
      cookies: res.headers['set-cookie'],
    })

    expect(vi.mocked(awslambda.HttpResponseStream.from).mock.results[0]!.value.chunkes).toEqual([
      Buffer.from('event: message\ndata: "foo"\n\n'),
      Buffer.from('event: message\ndata: "bar"\n\n'),
    ])

    expect(vi.mocked(awslambda.HttpResponseStream.from).mock.results[0]!.value.closed).toBe(true)
  })

  it('stream error while sending', async () => {
    let clean = false
    const res: StandardResponse = {
      body: (async function* () {
        try {
          yield 1
          await new Promise(r => setTimeout(r, 100))
          yield 2
          await new Promise(r => setTimeout(r, 100))
          yield 3
          await new Promise(r => setTimeout(r, 100))
          yield 4
        }
        finally {
          clean = true
        }
      })(),
      headers: {
        'x-custom-header': 'custom-value',
        'set-cookie': ['foo=bar', 'bar=baz'],
      },
      status: 206,
    }

    const responseStream = new Stream.Writable()

    const sendPromise = sendStandardResponse(responseStream, res, { eventIteratorKeepAliveComment: 'test' })

    await new Promise(r => setTimeout(r, 110))

    expect(vi.mocked(awslambda.HttpResponseStream.from).mock.results[0]!.value.chunkes).toEqual([
      Buffer.from('event: message\ndata: 1\n\n'),
      Buffer.from('event: message\ndata: 2\n\n'),
    ])

    expect(vi.mocked(awslambda.HttpResponseStream.from).mock.results[0]!.value.closed).toBe(false)
    expect(clean).toBe(false)

    vi.mocked(awslambda.HttpResponseStream.from).mock.results[0]!.value.destroy(new Error('test'))

    await new Promise(r => setTimeout(r, 110))

    expect(vi.mocked(awslambda.HttpResponseStream.from).mock.results[0]!.value.closed).toBe(true)
    expect(clean).toBe(true)

    await expect(sendPromise).rejects.toThrow('test')
  })
})
