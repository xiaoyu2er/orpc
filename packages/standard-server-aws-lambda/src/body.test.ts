import { Buffer } from 'node:buffer'
import { Readable } from 'node:stream'
import { isAsyncIteratorObject } from '@orpc/shared'
import * as StandardServerModule from '@orpc/standard-server'
import { toLambdaBody, toStandardBody } from './body'
import * as EventIteratorModule from './event-iterator'

const toEventStreamSpy = vi.spyOn(EventIteratorModule, 'toEventStream')
const generateContentDispositionSpy = vi.spyOn(StandardServerModule, 'generateContentDisposition')
const getFilenameFromContentDispositionSpy = vi.spyOn(StandardServerModule, 'getFilenameFromContentDisposition')

beforeEach(() => {
  vi.clearAllMocks()
})

describe.each([true, false])('toStandardBody: base64=%s', (isBase64Encoded) => {
  it('undefined', async () => {
    const standardBody = await toStandardBody({
      body: null,
      headers: {},
      httpMethod: 'POST',
      isBase64Encoded,
      multiValueHeaders: {},
      multiValueQueryStringParameters: {},
      path: '/',
      pathParameters: {},
      queryStringParameters: {},
      requestContext: {} as any,
      resource: '',
      stageVariables: {},
    })

    expect(standardBody).toBe(undefined)
  })

  it('json', async () => {
    const standardBody = await toStandardBody({
      body: Buffer.from(JSON.stringify({ foo: 'bar' })).toString(isBase64Encoded ? 'base64' : 'utf8'),
      headers: {
        'content-type': 'application/json',
      },
      httpMethod: 'POST',
      isBase64Encoded,
      multiValueHeaders: {},
      multiValueQueryStringParameters: {},
      path: '/',
      pathParameters: {},
      queryStringParameters: {},
      requestContext: {} as any,
      resource: '',
      stageVariables: {},
    })

    expect(standardBody).toEqual({ foo: 'bar' })
  })

  it('json but empty body', async () => {
    const standardBody = await toStandardBody({
      body: Buffer.from('').toString(isBase64Encoded ? 'base64' : 'utf8'),
      headers: {
        'content-type': 'application/json',
      },
      httpMethod: 'POST',
      isBase64Encoded,
      multiValueHeaders: {},
      multiValueQueryStringParameters: {},
      path: '/',
      pathParameters: {},
      queryStringParameters: {},
      requestContext: {} as any,
      resource: '',
      stageVariables: {},
    })

    expect(standardBody).toEqual(undefined)
  })

  it('event iterator', async () => {
    const standardBody: any = await toStandardBody({
      body: Buffer.from('event: message\ndata: 123\n\nevent: done\ndata: 456\n\n').toString(isBase64Encoded ? 'base64' : 'utf8'),
      headers: {
        'content-type': 'text/event-stream',
      },
      httpMethod: 'POST',
      isBase64Encoded,
      multiValueHeaders: {},
      multiValueQueryStringParameters: {},
      path: '/',
      pathParameters: {},
      queryStringParameters: {},
      requestContext: {} as any,
      resource: '',
      stageVariables: {},
    })

    expect(standardBody).toSatisfy(isAsyncIteratorObject)

    expect(await standardBody.next()).toEqual({ done: false, value: 123 })
    expect(await standardBody.next()).toEqual({ done: true, value: 456 })
  })

  it('text', async () => {
    const standardBody: any = await toStandardBody({
      body: Buffer.from('foo').toString(isBase64Encoded ? 'base64' : 'utf8'),
      headers: {
        'content-type': 'text/plain',
      },
      httpMethod: 'POST',
      isBase64Encoded,
      multiValueHeaders: {},
      multiValueQueryStringParameters: {},
      path: '/',
      pathParameters: {},
      queryStringParameters: {},
      requestContext: {} as any,
      resource: '',
      stageVariables: {},
    })

    expect(standardBody).toBe('foo')
  })

  it('form-data', async () => {
    const form = new FormData()
    form.append('foo', 'bar')
    form.append('bar', 'baz')
    const res = new Response(form)

    const standardBody: any = await toStandardBody({
      body: Buffer.from(await res.arrayBuffer()).toString('base64'),
      headers: {
        'content-type': res.headers.get('content-type')!,
      },
      httpMethod: 'POST',
      isBase64Encoded: true,
      multiValueHeaders: {},
      multiValueQueryStringParameters: {},
      path: '/',
      pathParameters: {},
      queryStringParameters: {},
      requestContext: {} as any,
      resource: '',
      stageVariables: {},
    })

    expect(standardBody).toBeInstanceOf(FormData)
    expect(standardBody.get('foo')).toBe('bar')
    expect(standardBody.get('bar')).toBe('baz')
  })

  it('form-data (empty)', async () => {
    await expect(toStandardBody({
      body: null,
      headers: {
        'content-type': 'multipart/form-data; boundary=foo',
      },
      httpMethod: 'POST',
      isBase64Encoded: true,
      multiValueHeaders: {},
      multiValueQueryStringParameters: {},
      path: '/',
      pathParameters: {},
      queryStringParameters: {},
      requestContext: {} as any,
      resource: '',
      stageVariables: {},
    })).rejects.toThrow('Failed to parse body as FormData')
  })

  it('url-search-params', async () => {
    const standardBody: any = await toStandardBody({
      body: Buffer.from('foo=bar&bar=baz').toString(isBase64Encoded ? 'base64' : 'utf8'),
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      httpMethod: 'POST',
      isBase64Encoded,
      multiValueHeaders: {},
      multiValueQueryStringParameters: {},
      path: '/',
      pathParameters: {},
      queryStringParameters: {},
      requestContext: {} as any,
      resource: '',
      stageVariables: {},
    })

    expect(standardBody).toEqual(new URLSearchParams('foo=bar&bar=baz'))
  })

  it('url-search-params (empty)', async () => {
    const standardBody: any = await toStandardBody({
      body: null,
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      httpMethod: 'POST',
      isBase64Encoded,
      multiValueHeaders: {},
      multiValueQueryStringParameters: {},
      path: '/',
      pathParameters: {},
      queryStringParameters: {},
      requestContext: {} as any,
      resource: '',
      stageVariables: {},
    })

    expect(standardBody).toEqual(new URLSearchParams())
  })

  it('blob', async () => {
    const standardBody: any = await toStandardBody({
      body: Buffer.from('foo').toString(isBase64Encoded ? 'base64' : 'utf8'),
      headers: {
        'content-type': 'application/pdf',
      },
      httpMethod: 'POST',
      isBase64Encoded,
      multiValueHeaders: {},
      multiValueQueryStringParameters: {},
      path: '/',
      pathParameters: {},
      queryStringParameters: {},
      requestContext: {} as any,
      resource: '',
      stageVariables: {},
    })

    expect(standardBody).toBeInstanceOf(File)
    expect(standardBody.name).toBe('blob')
    expect(standardBody.type).toBe('application/pdf')
    expect(await standardBody.text()).toBe('foo')

    expect(getFilenameFromContentDispositionSpy).toHaveBeenCalledTimes(0)
  })

  it('blob (empty)', async () => {
    const standardBody: any = await toStandardBody({
      body: null,
      headers: {
        'content-type': 'application/pdf',
      },
      httpMethod: 'POST',
      isBase64Encoded,
      multiValueHeaders: {},
      multiValueQueryStringParameters: {},
      path: '/',
      pathParameters: {},
      queryStringParameters: {},
      requestContext: {} as any,
      resource: '',
      stageVariables: {},
    })

    expect(standardBody).toBeInstanceOf(File)
    expect(standardBody.name).toBe('blob')
    expect(standardBody.type).toBe('application/pdf')
    expect(await standardBody.text()).toBe('')

    expect(getFilenameFromContentDispositionSpy).toHaveBeenCalledTimes(0)
  })

  it('file', async () => {
    getFilenameFromContentDispositionSpy.mockReturnValue('__name__')

    const standardBody: any = await toStandardBody({
      body: Buffer.from(JSON.stringify({ value: 123 })).toString(isBase64Encoded ? 'base64' : 'utf8'),
      headers: {
        'content-type': 'application/json',
        'content-disposition': 'attachment; filename="foo.pdf"',
      },
      httpMethod: 'POST',
      isBase64Encoded,
      multiValueHeaders: {},
      multiValueQueryStringParameters: {},
      path: '/',
      pathParameters: {},
      queryStringParameters: {},
      requestContext: {} as any,
      resource: '',
      stageVariables: {},
    })

    expect(standardBody).toBeInstanceOf(File)
    expect(standardBody.name).toBe('__name__')
    expect(standardBody.type).toBe('application/json')
    expect(await standardBody.text()).toBe('{"value":123}')

    expect(getFilenameFromContentDispositionSpy).toHaveBeenCalledTimes(1)
    expect(getFilenameFromContentDispositionSpy).toHaveBeenCalledWith('attachment; filename="foo.pdf"')
  })

  it('file with content-disposition (no filename)', async () => {
    getFilenameFromContentDispositionSpy.mockReturnValue(undefined)

    const standardBody: any = await toStandardBody({
      body: Buffer.from(JSON.stringify({ value: 123 })).toString(isBase64Encoded ? 'base64' : 'utf8'),
      headers: {
        'content-type': 'application/json',
        'content-disposition': 'attachment',
      },
      httpMethod: 'POST',
      isBase64Encoded,
      multiValueHeaders: {},
      multiValueQueryStringParameters: {},
      path: '/',
      pathParameters: {},
      queryStringParameters: {},
      requestContext: {} as any,
      resource: '',
      stageVariables: {},
    })

    expect(standardBody).toBeInstanceOf(File)
    expect(standardBody.name).toBe('blob')
    expect(standardBody.type).toBe('application/json')
    expect(await standardBody.text()).toBe('{"value":123}')

    expect(getFilenameFromContentDispositionSpy).toHaveBeenCalledTimes(1)
    expect(getFilenameFromContentDispositionSpy).toHaveBeenCalledWith('attachment')
  })

  it('file (no content-type)', async () => {
    getFilenameFromContentDispositionSpy.mockReturnValue(undefined)

    const standardBody: any = await toStandardBody({
      body: Buffer.from(JSON.stringify({ value: 123 })).toString(isBase64Encoded ? 'base64' : 'utf8'),
      headers: {
        'content-disposition': 'attachment',
      },
      httpMethod: 'POST',
      isBase64Encoded,
      multiValueHeaders: {},
      multiValueQueryStringParameters: {},
      path: '/',
      pathParameters: {},
      queryStringParameters: {},
      requestContext: {} as any,
      resource: '',
      stageVariables: {},
    })

    expect(standardBody).toBeInstanceOf(File)
    expect(standardBody.name).toBe('blob')
    expect(standardBody.type).toBe('')
    expect(await standardBody.text()).toBe('{"value":123}')

    expect(getFilenameFromContentDispositionSpy).toHaveBeenCalledTimes(1)
    expect(getFilenameFromContentDispositionSpy).toHaveBeenCalledWith('attachment')
  })
})

describe('toLambdaBody', () => {
  const baseHeaders = {
    'content-type': 'application/json',
    'x-custom-header': 'custom-value',
  }

  it('undefined', () => {
    const [body, headers] = toLambdaBody(undefined, baseHeaders, {})

    expect(body).toBe(undefined)
    expect(headers).toEqual({
      'x-custom-header': 'custom-value',
    })
  })

  it('json', () => {
    const [body, headers] = toLambdaBody({ foo: 'bar' }, baseHeaders, {})

    expect(body).toBe('{"foo":"bar"}')
    expect(headers).toEqual({
      'content-type': 'application/json',
      'x-custom-header': 'custom-value',
    })
  })

  it('form-data', async () => {
    const form = new FormData()
    form.append('foo', 'bar')
    form.append('bar', 'baz')

    const [body, headers] = toLambdaBody(form, baseHeaders, {})

    expect(body).toBeInstanceOf(Readable)
    expect(headers).toEqual({
      'x-custom-header': 'custom-value',
      'content-type': expect.stringMatching(/multipart\/form-data; .+/),
    })

    const response = new Response(body, {
      headers,
    })
    const resForm = await response.formData()

    expect(resForm.get('foo')).toBe('bar')
    expect(resForm.get('bar')).toBe('baz')
  })

  it('url-search-params', async () => {
    const query = new URLSearchParams('foo=bar&bar=baz')
    const [body, headers] = toLambdaBody(query, baseHeaders, {})

    expect(body).toBe('foo=bar&bar=baz')
    expect(headers).toEqual({
      'x-custom-header': 'custom-value',
      'content-type': 'application/x-www-form-urlencoded',
    })
  })

  it('blob', async () => {
    const blob = new Blob(['foo'], { type: 'application/pdf' })
    generateContentDispositionSpy.mockReturnValue('__mocked__')
    const [body, headers] = toLambdaBody(blob, baseHeaders, {})

    expect(body).toBeInstanceOf(Readable)
    expect(headers).toEqual({
      'content-disposition': '__mocked__',
      'content-length': '3',
      'content-type': 'application/pdf',
      'x-custom-header': 'custom-value',
    })

    expect(generateContentDispositionSpy).toHaveBeenCalledTimes(1)
    expect(generateContentDispositionSpy).toHaveBeenCalledWith('blob')

    const response = new Response(body, {
      headers,
    })
    const resBlob = await response.blob()

    expect(resBlob.type).toBe('application/pdf')
    expect(await resBlob.text()).toBe('foo')
  })

  it('file', async () => {
    const blob = new File(['foo'], 'foo.pdf', { type: 'application/pdf' })
    generateContentDispositionSpy.mockReturnValue('__mocked__')

    const [body, headers] = toLambdaBody(blob, baseHeaders, {})

    expect(body).instanceOf(Readable)
    expect(headers).toEqual({
      'content-disposition': '__mocked__',
      'content-length': '3',
      'content-type': 'application/pdf',
      'x-custom-header': 'custom-value',
    })

    expect(generateContentDispositionSpy).toHaveBeenCalledTimes(1)
    expect(generateContentDispositionSpy).toHaveBeenCalledWith('foo.pdf')

    const response = new Response(body, {
      headers,
    })
    const resBlob = await response.blob()

    expect(resBlob.type).toBe('application/pdf')
    expect(await resBlob.text()).toBe('foo')
  })

  it('file with content-disposition', async () => {
    const blob = new File(['foo'], 'foo.pdf', { type: 'application/pdf' })

    const [body, headers] = toLambdaBody(blob, { ...baseHeaders, 'content-disposition': 'attachment; filename="foo.pdf"' }, {})

    expect(body).instanceOf(Readable)
    expect(headers).toEqual({
      'content-disposition': 'attachment; filename="foo.pdf"',
      'content-length': '3',
      'content-type': 'application/pdf',
      'x-custom-header': 'custom-value',
    })

    expect(generateContentDispositionSpy).toHaveBeenCalledTimes(0)

    const response = new Response(body, {
      headers,
    })
    const resBlob = await response.blob()

    expect(resBlob.type).toBe('application/pdf')
    expect(await resBlob.text()).toBe('foo')
  })

  it('async generator', async () => {
    async function* gen() {
      yield 123
      return 456
    }
    const options = { eventIteratorKeepAliveEnabled: true }
    const iterator = gen()
    const [body, headers] = toLambdaBody(iterator, baseHeaders, options)

    expect(toEventStreamSpy).toHaveBeenCalledWith(iterator, options)

    expect(body).toBeInstanceOf(Readable)
    expect(headers).toEqual({
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      'connection': 'keep-alive',
      'x-custom-header': 'custom-value',
    })

    const reader = Readable.toWeb((body as Readable)).pipeThrough(new TextDecoderStream()).getReader()

    expect(await reader.read()).toEqual({ done: false, value: 'event: message\ndata: 123\n\n' })
    expect(await reader.read()).toEqual({ done: false, value: 'event: done\ndata: 456\n\n' })
  })
})
