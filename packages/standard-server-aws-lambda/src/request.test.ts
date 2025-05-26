import type { APIGatewayEvent } from 'aws-lambda'
import { isAsyncIteratorObject } from '@orpc/shared'
import * as Body from './body'
import * as Headers from './headers'
import { toStandardLazyRequest } from './request'

const toStandardBodySpy = vi.spyOn(Body, 'toStandardBody')
const toStandardHeadersSpy = vi.spyOn(Headers, 'toStandardHeaders')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('toStandardLazyRequest', () => {
  const event: APIGatewayEvent = {
    httpMethod: 'POST',
    body: JSON.stringify({ foo: 'bar' }),
    headers: {
      'host': 'example.com',
      'content-type': 'application/json',
    },
    isBase64Encoded: false,
    multiValueHeaders: {
      cookie: ['foo=bar', 'bar=baz'],
    },
    multiValueQueryStringParameters: {},
    path: '/',
    pathParameters: {},
    queryStringParameters: {},
    requestContext: {} as any,
    resource: '',
    stageVariables: {},
  }

  it('works', () => {
    const standardRequest = toStandardLazyRequest(event)

    expect(standardRequest.url).toEqual(new URL('https://example.com'))
    expect(standardRequest.method).toBe('POST')
    expect(standardRequest.signal).toBe(undefined)
    expect(standardRequest.headers).toEqual(toStandardHeadersSpy.mock.results[0]!.value)
    expect(standardRequest.body()).toBe(toStandardBodySpy.mock.results[0]!.value)

    expect(toStandardHeadersSpy).toBeCalledTimes(1)
    expect(toStandardHeadersSpy).toBeCalledWith(event.headers, event.multiValueHeaders)

    expect(toStandardBodySpy).toBeCalledTimes(1)
    expect(toStandardBodySpy).toBeCalledWith(event)
  })

  it('lazy headers', async () => {
    const lazyResponse = toStandardLazyRequest(event)

    expect(toStandardHeadersSpy).toBeCalledTimes(0)
    lazyResponse.headers = { overrided: '1' }
    expect(lazyResponse.headers).toEqual({ overrided: '1' }) // can override before access
    expect(toStandardHeadersSpy).toBeCalledTimes(0)

    const lazyResponse2 = toStandardLazyRequest(event)
    expect(lazyResponse2.headers).toEqual(toStandardHeadersSpy.mock.results[0]!.value)
    expect(lazyResponse2.headers).toEqual(toStandardHeadersSpy.mock.results[0]!.value) // ensure cached
    expect(toStandardHeadersSpy).toBeCalledTimes(1)

    lazyResponse2.headers = { overrided: '2' }
    expect(lazyResponse2.headers).toEqual({ overrided: '2' }) // can override after access
  })

  it('lazy body', async () => {
    const lazyResponse = toStandardLazyRequest(event)

    expect(toStandardBodySpy).toBeCalledTimes(0)
    const overrideBody = () => Promise.resolve('1')
    lazyResponse.body = overrideBody
    expect(lazyResponse.body).toBe(overrideBody)
    expect(toStandardBodySpy).toBeCalledTimes(0)

    const lazyResponse2 = toStandardLazyRequest(event)
    expect(lazyResponse2.body()).toEqual(toStandardBodySpy.mock.results[0]!.value)
    expect(lazyResponse2.body()).toEqual(toStandardBodySpy.mock.results[0]!.value) // ensure cached
    expect(toStandardBodySpy).toBeCalledTimes(1)
  })

  it('with event iterator', async () => {
    const body = await toStandardLazyRequest({
      ...event,
      body: 'event: message\ndata: "foo"\n\nevent: done\ndata: "bar"\n\n',
      isBase64Encoded: false,
      headers: {
        'content-type': 'text/event-stream',
      },
    }).body() as AsyncGenerator

    expect(body).toSatisfy(isAsyncIteratorObject)
    expect(await body.next()).toEqual({ done: false, value: 'foo' })
    expect(await body.next()).toEqual({ done: true, value: 'bar' })
  })
})
