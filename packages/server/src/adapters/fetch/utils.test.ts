import { fetchRequestToStandardRequest, standardResponseToFetchResponse } from './utils'

describe('fetchRequestToStandardRequest', () => {
  const url = new URL('https://example.com/api/v1/users/1')
  const headers = [
    ['x-custom-header', 'custom-value'],
    ['set-cookie', 'foo=bar'],
    ['set-cookie', 'baz=qux'],
    ['set-cookie', 'qux=quux'],
  ] satisfies HeadersInit

  it('without body', async () => {
    const standardRequest = fetchRequestToStandardRequest(new Request(url, {
      headers,
      method: 'GET',
    }))

    expect(await standardRequest.body()).toBeUndefined()

    expect(standardRequest.url).toEqual(url)
    expect(standardRequest.headers).toEqual({
      'x-custom-header': 'custom-value',
      'set-cookie': ['foo=bar', 'baz=qux', 'qux=quux'],
    })
  })

  it('with json', async () => {
    const standardRequest = fetchRequestToStandardRequest(new Request(url, {
      method: 'POST',
      headers: [
        ...headers,
        ['content-type', 'application/json'],
      ],
      body: JSON.stringify({
        name: 'John Doe',
      }),
    }))

    expect(await standardRequest.body()).toEqual({
      name: 'John Doe',
    })

    expect(standardRequest.url).toEqual(url)
    expect(standardRequest.headers).toEqual({
      'content-type': 'application/json',
      'x-custom-header': 'custom-value',
      'set-cookie': ['foo=bar', 'baz=qux', 'qux=quux'],
    })
  })

  it('with empty json', async () => {
    const standardRequest = fetchRequestToStandardRequest(new Request(url, {
      method: 'POST',
      headers: [
        ...headers,
        ['content-type', 'application/json'],
      ],
      body: '',
    }))

    expect(await standardRequest.body()).toBeUndefined()

    expect(standardRequest.url).toEqual(url)
    expect(standardRequest.headers).toEqual({
      'content-type': 'application/json',
      'x-custom-header': 'custom-value',
      'set-cookie': ['foo=bar', 'baz=qux', 'qux=quux'],
    })
  })

  it('with file json', async () => {
    const standardRequest = fetchRequestToStandardRequest(new Request(url, {
      method: 'POST',
      headers: [
        ...headers,
        ['content-disposition', 'attachment; filename="john.json"'],
        ['content-type', 'application/json'],
      ],
      body: JSON.stringify({
        name: 'John Doe',
      }),
    }))

    const body = await standardRequest.body()

    expect(body).toBeInstanceOf(File)
    expect(await (body as any).text()).toEqual('{"name":"John Doe"}')
    expect((body as any).type).toEqual('application/json')
    expect((body as any).name).toEqual('john.json')

    expect(standardRequest.url).toEqual(url)
    expect(standardRequest.headers).toEqual({
      'content-type': 'application/json',
      'content-disposition': 'attachment; filename="john.json"',
      'x-custom-header': 'custom-value',
      'set-cookie': ['foo=bar', 'baz=qux', 'qux=quux'],
    })
  })

  it('with form-data', async () => {
    const form = new FormData()
    form.append('name', 'John Doe')
    form.append('age', '30')

    const standardRequest = fetchRequestToStandardRequest(new Request(url, {
      method: 'POST',
      headers,
      body: form,
    }))

    const body = await standardRequest.body()

    expect(body).instanceOf(FormData)
    expect((body as any).get('name')).toEqual('John Doe')
    expect((body as any).get('age')).toEqual('30')

    expect(standardRequest.url).toEqual(url)
    expect(standardRequest.headers).toEqual({
      'content-type': expect.any(String),
      'x-custom-header': 'custom-value',
      'set-cookie': ['foo=bar', 'baz=qux', 'qux=quux'],
    })
  })

  it('with x-www-form-urlencoded', async () => {
    const standardRequest = fetchRequestToStandardRequest(new Request(url, {
      method: 'POST',
      headers: [
        ...headers,
        ['content-type', 'application/x-www-form-urlencoded'],
      ],
      body: 'name=John+Doe&age=30',
    }))

    expect(await standardRequest.body()).toEqual(new URLSearchParams('name=John+Doe&age=30'))

    expect(standardRequest.url).toEqual(url)
    expect(standardRequest.headers).toEqual({
      'content-type': 'application/x-www-form-urlencoded',
      'x-custom-header': 'custom-value',
      'set-cookie': ['foo=bar', 'baz=qux', 'qux=quux'],
    })
  })

  it('with text', async () => {
    const standardRequest = fetchRequestToStandardRequest(new Request(url, {
      method: 'POST',
      headers: [
        ...headers,
        ['content-type', 'text/plain'],
      ],
      body: 'John Doe',
    }))

    expect(await standardRequest.body()).toEqual('John Doe')

    expect(standardRequest.url).toEqual(url)
    expect(standardRequest.headers).toEqual({
      'content-type': 'text/plain',
      'x-custom-header': 'custom-value',
      'set-cookie': ['foo=bar', 'baz=qux', 'qux=quux'],
    })
  })

  it('with blob', async () => {
    const blob = new Blob(['John Doe'], { type: 'application/octet-stream' })
    const standardRequest = fetchRequestToStandardRequest(new Request(url, {
      method: 'POST',
      headers,
      body: blob,
    }))

    const body = await standardRequest.body()

    expect(body).toBeInstanceOf(File)
    expect(await (body as any).text()).toEqual('John Doe')
    expect((body as any).type).toEqual('application/octet-stream')
    expect((body as any).name).toEqual('blob')

    expect(standardRequest.url).toEqual(url)
    expect(standardRequest.headers).toEqual({
      'content-type': 'application/octet-stream',
      'x-custom-header': 'custom-value',
      'set-cookie': ['foo=bar', 'baz=qux', 'qux=quux'],
    })
  })

  it('with file name', async () => {
    const file = new File(['John Doe'], '__ignored__', { type: 'application/octet-stream' })
    const standardRequest = fetchRequestToStandardRequest(new Request(url, {
      method: 'POST',
      headers: [
        ...headers,
        ['content-disposition', 'attachment; filename="john.txt"'],
      ],
      body: file,
    }))

    const body = await standardRequest.body()

    expect(body).toBeInstanceOf(File)
    expect(await (body as any).text()).toEqual('John Doe')
    expect((body as any).type).toEqual('application/octet-stream')
    expect((body as any).name).toEqual('john.txt')

    expect(standardRequest.url).toEqual(url)
    expect(standardRequest.headers).toEqual({
      'content-type': 'application/octet-stream',
      'content-disposition': 'attachment; filename="john.txt"',
      'x-custom-header': 'custom-value',
      'set-cookie': ['foo=bar', 'baz=qux', 'qux=quux'],
    })
  })

  it('can override headers', async () => {
    const standardRequest = fetchRequestToStandardRequest(new Request(url, {
      headers,
      method: 'GET',
    }))

    const newHeaders = { 'x-new-header': 'new-value' }
    standardRequest.headers = newHeaders
    expect(standardRequest.headers).toEqual(newHeaders)
  })
})

describe('standardResponseToFetchResponse', () => {
  const headers = {
    'x-custom-header': 'custom-value',
    'set-cookie': ['foo=bar', 'baz=qux', 'qux=quux'],
  }

  it('with empty body', async () => {
    const response = standardResponseToFetchResponse({
      body: undefined,
      headers,
      status: 206,
    })

    expect(response.body).toBeNull()

    expect(response.status).toEqual(206)
    expect([...response.headers.entries()]).toEqual([
      ['set-cookie', 'foo=bar'],
      ['set-cookie', 'baz=qux'],
      ['set-cookie', 'qux=quux'],
      ['x-custom-header', 'custom-value'],
    ])
  })

  it('with json body', async () => {
    const response = standardResponseToFetchResponse({
      body: {
        name: 'John Doe',
      },
      headers,
      status: 207,
    })

    expect(await response.json()).toEqual({
      name: 'John Doe',
    })

    expect(response.status).toEqual(207)
    expect([...response.headers.entries()]).toEqual([
      ['content-type', 'application/json'],
      ['set-cookie', 'foo=bar'],
      ['set-cookie', 'baz=qux'],
      ['set-cookie', 'qux=quux'],
      ['x-custom-header', 'custom-value'],
    ])
  })

  it('with form-data body', async () => {
    const form = new FormData()
    form.append('name', 'John Doe')
    form.append('age', '30')

    const response = standardResponseToFetchResponse({
      body: form,
      headers,
      status: 208,
    })

    expect(await response.formData()).toEqual(form)

    expect(response.status).toEqual(208)
    expect([...response.headers.entries()]).toEqual([
      ['content-type', expect.any(String)],
      ['set-cookie', 'foo=bar'],
      ['set-cookie', 'baz=qux'],
      ['set-cookie', 'qux=quux'],
      ['x-custom-header', 'custom-value'],
    ])
  })

  it('with x-www-form-urlencoded body', async () => {
    const response = standardResponseToFetchResponse({
      body: new URLSearchParams('name=John+Doe&age=30'),
      headers,
      status: 208,
    })

    expect(await response.text()).toEqual('name=John+Doe&age=30')

    expect(response.status).toEqual(208)
    expect([...response.headers.entries()]).toEqual([
      ['content-type', 'application/x-www-form-urlencoded;charset=UTF-8'],
      ['set-cookie', 'foo=bar'],
      ['set-cookie', 'baz=qux'],
      ['set-cookie', 'qux=quux'],
      ['x-custom-header', 'custom-value'],
    ])
  })

  it('with blob body', async () => {
    const blob = new Blob(['John Doe'], { type: 'text/plain' })
    const response = standardResponseToFetchResponse({
      body: blob,
      headers,
      status: 209,
    })

    expect(await response.blob()).toEqual(blob)

    expect(response.status).toEqual(209)
    expect([...response.headers.entries()]).toEqual([
      ['content-type', 'text/plain'],
      ['set-cookie', 'foo=bar'],
      ['set-cookie', 'baz=qux'],
      ['set-cookie', 'qux=quux'],
      ['x-custom-header', 'custom-value'],
    ])
  })

  it('with file body', async () => {
    const file = new File(['John Doe'], 'john.txt', { type: 'application/json' })
    const response = standardResponseToFetchResponse({
      body: file,
      headers,
      status: 210,
    })

    const body = await response.blob()

    expect(body).toBeInstanceOf(Blob)
    expect(await (body as any).text()).toEqual('John Doe')
    expect((body as any).type).toEqual('application/json')

    expect(response.status).toEqual(210)
    expect([...response.headers.entries()]).toEqual([
      ['content-disposition', 'attachment; filename="john.txt"'],
      ['content-type', 'application/json'],
      ['set-cookie', 'foo=bar'],
      ['set-cookie', 'baz=qux'],
      ['set-cookie', 'qux=quux'],
      ['x-custom-header', 'custom-value'],
    ])
  })
})
