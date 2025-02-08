import type { IncomingMessage, ServerResponse } from 'node:http'
import { Buffer } from 'node:buffer'
import { Readable } from 'node:stream'
import { inject } from 'light-my-request'
import { nodeHttpResponseSendStandardResponse, nodeHttpToStandardRequest } from './utils'

describe('nodeHttpToStandardRequest', () => {
  const url = new URL('http://localhost/api/v1/users/1')
  const headers = {
    'x-custom-header': 'custom-value',
    // 'set-cookie': ['foo=bar', 'baz=qux', 'qux=quux'], TODO: fix set-cookie
  }

  let req: any, res: any

  function setReqRes(_req: IncomingMessage, _res: ServerResponse) {
    req = _req
    res = _res
    _res.end('hello world')
  }

  it('without body', async () => {
    await inject(setReqRes, {
      method: 'GET',
      url: url.pathname,
      headers,
    })

    const standardRequest = nodeHttpToStandardRequest(req, res)

    expect(await standardRequest.body()).toBeUndefined()
    expect(standardRequest.url).toEqual(url)
    expect(standardRequest.headers).toEqual({
      ...headers,
      'user-agent': expect.any(String),
      'host': expect.any(String),
    })
  })

  it('with json', async () => {
    await inject(setReqRes, {
      method: 'POST',
      url: url.pathname,
      headers: {
        ...headers,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ name: 'John Doe' }),
    })

    const standardRequest = nodeHttpToStandardRequest(req, res)

    expect(await standardRequest.body()).toEqual({ name: 'John Doe' })
    expect(standardRequest.url).toEqual(url)
    expect(standardRequest.headers).toEqual({
      ...headers,
      'content-type': 'application/json',
      'user-agent': expect.any(String),
      'host': expect.any(String),
      'content-length': expect.any(String),
    })
  })

  it('with empty json', async () => {
    await inject(setReqRes, {
      method: 'POST',
      url: url.pathname,
      headers: {
        ...headers,
        'content-type': 'application/json',
      },
      body: '',
    })

    const standardRequest = nodeHttpToStandardRequest(req, res)

    expect(await standardRequest.body()).toEqual(undefined)
    expect(standardRequest.url).toEqual(url)
    expect(standardRequest.headers).toEqual({
      ...headers,
      'content-type': 'application/json',
      'user-agent': expect.any(String),
      'host': expect.any(String),
    })
  })

  it('with file json', async () => {
    await inject(setReqRes, {
      method: 'POST',
      url: url.pathname,
      headers: {
        ...headers,
        'content-type': 'application/json',
        'content-disposition': 'attachment; filename="john.json"',
      },
      body: JSON.stringify({ name: 'John Doe' }),
    })

    const standardRequest = nodeHttpToStandardRequest(req, res)
    const body = await standardRequest.body()

    expect(body).toBeInstanceOf(File)
    expect(await (body as any).text()).toEqual('{"name":"John Doe"}')
    expect((body as any).type).toEqual('application/json')
    expect((body as any).name).toEqual('john.json')

    expect(standardRequest.url).toEqual(url)
    expect(standardRequest.headers).toEqual({
      ...headers,
      'content-type': 'application/json',
      'content-disposition': 'attachment; filename="john.json"',
      'user-agent': expect.any(String),
      'host': expect.any(String),
      'content-length': expect.any(String),
    })
  })

  it('with form-data', async () => {
    const form = new FormData()
    form.append('name', 'John Doe')
    form.append('age', '30')

    const response = new Response(form) as any

    await inject(setReqRes, {
      method: 'POST',
      url: url.pathname,
      headers: {
        ...headers,
        'content-type': response.headers.get('content-type')!,
      },
      body: Readable.fromWeb(response.body!),
    })

    const standardRequest = nodeHttpToStandardRequest(req, res)
    const body = await standardRequest.body()
    expect(body).toBeInstanceOf(FormData)
    expect((body as any).get('name')).toEqual('John Doe')
    expect((body as any).get('age')).toEqual('30')
    expect(standardRequest.url).toEqual(url)
    expect(standardRequest.headers).toEqual({
      ...headers,
      'content-type': response.headers.get('content-type')!,
      'user-agent': expect.any(String),
      'host': expect.any(String),
    })
  })

  it('with x-www-form-urlencoded', async () => {
    await inject(setReqRes, {
      method: 'POST',
      url: url.pathname,
      headers: {
        ...headers,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: 'name=John+Doe&age=30',
    })

    const standardRequest = nodeHttpToStandardRequest(req, res)
    const body = await standardRequest.body()
    expect(body).toBeInstanceOf(URLSearchParams)
    expect((body as any).get('name')).toEqual('John Doe')
    expect((body as any).get('age')).toEqual('30')
    expect(standardRequest.url).toEqual(url)
    expect(standardRequest.headers).toEqual({
      ...headers,
      'content-type': 'application/x-www-form-urlencoded',
      'user-agent': expect.any(String),
      'host': expect.any(String),
      'content-length': expect.any(String),
    })
  })

  it('with text', async () => {
    await inject(setReqRes, {
      method: 'POST',
      url: url.pathname,
      headers: {
        ...headers,
        'content-type': 'text/plain',
      },
      body: 'John Doe',
    })

    const standardRequest = nodeHttpToStandardRequest(req, res)

    expect(await standardRequest.body()).toEqual('John Doe')
    expect(standardRequest.url).toEqual(url)
    expect(standardRequest.headers).toEqual({
      ...headers,
      'content-type': 'text/plain',
      'user-agent': expect.any(String),
      'host': expect.any(String),
      'content-length': expect.any(String),
    })
  })

  it('with buffer', async () => {
    await inject(setReqRes, {
      method: 'POST',
      url: url.pathname,
      headers: {
        ...headers,
        'content-type': 'application/octet-stream',
      },
      body: Buffer.from('John Doe'),
    })

    const standardRequest = nodeHttpToStandardRequest(req, res)
    const body = await standardRequest.body()
    expect(body).toBeInstanceOf(File)
    expect(await (body as any).text()).toEqual('John Doe')
    expect((body as any).name).toEqual('blob')
    expect((body as any).type).toEqual('application/octet-stream')
    expect(standardRequest.url).toEqual(url)
    expect(standardRequest.headers).toEqual({
      ...headers,
      'content-type': 'application/octet-stream',
      'user-agent': expect.any(String),
      'host': expect.any(String),
      'content-length': expect.any(String),
    })
  })

  it('with buffer and file name', async () => {
    await inject(setReqRes, {
      method: 'POST',
      url: url.pathname,
      headers: {
        ...headers,
        'content-type': 'application/json',
        'content-disposition': 'attachment; filename="john.txt"',
      },
      body: Buffer.from('John Doe'),
    })

    const standardRequest = nodeHttpToStandardRequest(req, res)
    const body = await standardRequest.body()
    expect(body).toBeInstanceOf(File)
    expect(await (body as any).text()).toEqual('John Doe')
    expect((body as any).name).toEqual('john.txt')
    expect((body as any).type).toEqual('application/json')
    expect(standardRequest.url).toEqual(url)
    expect(standardRequest.headers).toEqual({
      ...headers,
      'content-type': 'application/json',
      'content-disposition': 'attachment; filename="john.txt"',
      'user-agent': expect.any(String),
      'host': expect.any(String),
      'content-length': expect.any(String),
    })
  })
})

describe('standardResponseToFetchResponse', () => {
  const headers = {
    'x-custom-header': 'custom-value',
    'set-cookie': ['foo=bar', 'baz=qux', 'qux=quux'],
  }

  it('with empty body', async () => {
    const res = await inject((req, res) => nodeHttpResponseSendStandardResponse(res, {
      body: undefined,
      headers,
      status: 206,
    }), {
      url: '/',
    })

    expect(res.body).toBe('')

    expect(res.statusCode).toEqual(206)
    expect(res.headers).toEqual({
      ...headers,
      'connection': expect.any(String),
      'date': expect.any(String),
      'transfer-encoding': expect.any(String),
    })
  })

  it('with json body', async () => {
    const res = await inject((req, res) => nodeHttpResponseSendStandardResponse(res, {
      body: {
        name: 'John Doe',
      },
      headers,
      status: 207,
    }), {
      url: '/',
    })

    expect(res.body).toBe(JSON.stringify({
      name: 'John Doe',
    }))

    expect(res.statusCode).toEqual(207)
    expect(res.headers).toEqual({
      ...headers,
      'content-type': 'application/json',
      'connection': expect.any(String),
      'date': expect.any(String),
      'transfer-encoding': expect.any(String),
    })
  })

  it('with form-data body', async () => {
    const form = new FormData()
    form.append('name', 'John Doe')
    form.append('age', '30')

    const res = await inject((req, res) => nodeHttpResponseSendStandardResponse(res, {
      body: form,
      headers,
      status: 208,
    }), {
      url: '/',
    })

    const response = new Response(res.body, {
      headers: res.headers as any,
    })

    const resForm = await response.formData()
    expect(resForm.get('name')).toEqual('John Doe')
    expect(resForm.get('age')).toEqual('30')
  })

  it('with x-www-form-urlencoded body', async () => {
    const res = await inject((req, res) => nodeHttpResponseSendStandardResponse(res, {
      body: new URLSearchParams('name=John+Doe&age=30'),
      headers,
      status: 208,
    }), {
      url: '/',
    })

    expect(res.body).toBe('name=John+Doe&age=30')

    expect(res.statusCode).toEqual(208)
    expect(res.headers).toEqual({
      ...headers,
      'content-type': 'application/x-www-form-urlencoded',
      'connection': expect.any(String),
      'date': expect.any(String),
      'transfer-encoding': expect.any(String),
    })
  })

  it('with blob body', async () => {
    const blob = new Blob(['John Doe'], { type: 'text/plain' })

    const res = await inject((req, res) => nodeHttpResponseSendStandardResponse(res, {
      body: blob,
      headers,
      status: 209,
    }), {
      url: '/',
    })

    expect(res.body).toBe('John Doe')

    expect(res.statusCode).toEqual(209)
    expect(res.headers).toEqual({
      ...headers,
      'content-type': 'text/plain',
      'content-disposition': 'inline; filename="blob"',
      'content-length': '8',
      'connection': expect.any(String),
      'date': expect.any(String),
    })
  })

  it('with file body', async () => {
    const file = new File(['John Doe'], 'john.txt', { type: 'application/json' })

    const res = await inject((req, res) => nodeHttpResponseSendStandardResponse(res, {
      body: file,
      headers,
      status: 210,
    }), {
      url: '/',
    })

    expect(res.body).toBe('John Doe')

    expect(res.statusCode).toEqual(210)
    expect(res.headers).toEqual({
      ...headers,
      'content-type': 'application/json',
      'content-disposition': 'inline; filename="john.txt"',
      'content-length': '8',
      'connection': expect.any(String),
      'date': expect.any(String),
    })
  })
})
