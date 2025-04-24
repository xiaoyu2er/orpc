import { decodeRequestMessage, decodeResponseMessage, encodeRequestMessage, encodeResponseMessage } from './codec'

describe('encode/decode request message', () => {
  it('abort signal', async () => {
    const message = await encodeRequestMessage(198, 'ABORT_SIGNAL', undefined)

    expect(message).toBeTypeOf('string')

    const [id, type, payload] = await decodeRequestMessage(message)

    expect(id).toBe(198)
    expect(type).toBe('ABORT_SIGNAL')
    expect(payload).toBeUndefined()
  })

  it('event iterator', async () => {
    const message = await encodeRequestMessage(198, 'EVENT_ITERATOR', {
      event: 'message',
      data: 'hello',
      meta: {
        id: 'id-1',
        retry: 0,
        comments: [],
      },
    })

    expect(message).toBeTypeOf('string')

    const [id, type, payload] = await decodeRequestMessage(message)

    expect(id).toBe(198)
    expect(type).toBe('EVENT_ITERATOR')
    expect(payload).toEqual({
      event: 'message',
      data: 'hello',
      meta: {
        id: 'id-1',
        retry: 0,
        comments: [],
      },
    })
  })

  describe.each([
    ['GET', new URL('https://example.com/api/v1/users/1?a=1&b=2'), {}],
    ['POST', new URL('https://example.com/api/v1/users/1'), { 'x-custom-header': 'value' }],
    ['DELETE', new URL('https://example.com/api/v1/users/1'), { }],
  ] as const)('request', (method, url, headers) => {
    it('undefined', async () => {
      const message = await encodeRequestMessage(198, 'REQUEST', {
        url,
        headers,
        method,
        body: undefined,
      })

      expect(message).toBeTypeOf('string')

      const [id, type, payload] = await decodeRequestMessage(message)

      expect(id).toBe(198)
      expect(type).toBe('REQUEST')
      expect(payload).toEqual({
        url,
        headers,
        method,
        body: undefined,
      })
    })

    it('json', async () => {
      const message = await encodeRequestMessage(198, 'REQUEST', {
        url,
        headers,
        method,
        body: { value: 1 },
      })

      expect(message).toBeTypeOf('string')

      const [id, type, payload] = await decodeRequestMessage(message)

      expect(id).toBe(198)
      expect(type).toBe('REQUEST')
      expect(payload).toEqual({
        url,
        headers,
        method,
        body: { value: 1 },
      })
    })

    it('urlSearchParams', async () => {
      const query = new URLSearchParams('a=1&b=2')

      const message = await encodeRequestMessage(198, 'REQUEST', {
        url,
        headers,
        method,
        body: query,
      })

      expect(message).toBeTypeOf('string')

      const [id, type, payload] = await decodeRequestMessage(message)

      expect(id).toBe(198)
      expect(type).toBe('REQUEST')
      expect(payload).toEqual({
        url,
        headers: { ...headers, 'content-type': 'application/x-www-form-urlencoded' },
        method,
        body: query,
      })
    })

    it('event iterator', async () => {
      const message = await encodeRequestMessage(198, 'REQUEST', {
        url,
        method,
        headers,
        body: (async function* () { })(),
      })

      expect(message).toBeTypeOf('string')

      const [id, type, payload] = await decodeRequestMessage(message)

      expect(id).toBe(198)
      expect(type).toBe('REQUEST')
      expect(payload).toEqual({
        url,
        method,
        headers: { ...headers, 'content-type': 'text/event-stream' },
        body: undefined,
      })
    })

    it('blob', async () => {
      const blob = new Blob(['foo'], { type: 'application/pdf' })

      const message = await encodeRequestMessage(198, 'REQUEST', {
        url,
        headers,
        method,
        body: blob,
      })

      expect(message).toBeInstanceOf(Blob)

      const [id, type, payload] = await decodeRequestMessage(message)

      expect(id).toBe(198)
      expect(type).toBe('REQUEST')
      expect(payload).toEqual({
        url,
        headers: {
          ...headers,
          'content-type': 'application/pdf',
          'content-disposition': expect.any(String),
        },
        method,
        body: expect.toSatisfy(blob => blob instanceof Blob),
      })

      expect(await (payload as any).body.text()).toBe('foo')
    })

    it('blob with custom content-disposition', async () => {
      const blob = new Blob(['foo'], { type: 'application/pdf' })

      const message = await encodeRequestMessage(198, 'REQUEST', {
        url,
        headers: {
          ...headers,
          'content-disposition': 'attachment; filename="some-name.pdf"',
        },
        method,
        body: blob,
      })

      expect(message).toBeInstanceOf(Blob)

      const [id, type, payload] = await decodeRequestMessage(message)

      expect(id).toBe(198)
      expect(type).toBe('REQUEST')
      expect(payload).toEqual({
        url,
        headers: {
          ...headers,
          'content-type': 'application/pdf',
          'content-disposition': 'attachment; filename="some-name.pdf"',
        },
        method,
        body: expect.toSatisfy(blob => blob instanceof Blob),
      })

      expect(await (payload as any).body.text()).toBe('foo')
    })

    it('file', async () => {
      const file = new File(['foo'], 'some-name.pdf', { type: 'application/pdf' })

      const message = await encodeRequestMessage(198, 'REQUEST', {
        url,
        headers,
        method,
        body: file,
      })

      expect(message).toBeInstanceOf(Blob)

      const [id, type, payload] = await decodeRequestMessage(message)

      expect(id).toBe(198)
      expect(type).toBe('REQUEST')
      expect(payload).toEqual({
        url,
        headers: {
          ...headers,
          'content-type': 'application/pdf',
          'content-disposition': expect.any(String),
        },
        method,
        body: expect.toSatisfy(blob => blob instanceof Blob),
      })

      expect(await (payload as any).body.text()).toBe('foo')
    })

    it('file with custom content-disposition', async () => {
      const file = new File(['foo'], 'some-name.pdf', { type: 'application/pdf' })

      const message = await encodeRequestMessage(198, 'REQUEST', {
        url,
        headers: {
          ...headers,
          'content-disposition': 'attachment',
        },
        method,
        body: file,
      })

      expect(message).toBeInstanceOf(Blob)

      const [id, type, payload] = await decodeRequestMessage(message)

      expect(id).toBe(198)
      expect(type).toBe('REQUEST')
      expect(payload).toEqual({
        url,
        headers: {
          ...headers,
          'content-type': 'application/pdf',
          'content-disposition': 'attachment',
        },
        method,
        body: expect.toSatisfy(blob => blob instanceof Blob),
      })

      expect(await (payload as any).body.text()).toBe('foo')
    })

    it('formData', async () => {
      const formData = new FormData()
      formData.append('a', '1')
      formData.append('b', '2')
      formData.append('file', new File(['foo'], 'some-name.pdf', { type: 'application/pdf' }))

      const message = await encodeRequestMessage(198, 'REQUEST', {
        url,
        headers,
        method,
        body: formData,
      })

      expect(message).toBeInstanceOf(Blob)

      const [id, type, payload] = await decodeRequestMessage(message)

      expect(id).toBe(198)
      expect(type).toBe('REQUEST')
      expect(payload).toEqual({
        url,
        headers: {
          ...headers,
          'content-type': expect.stringContaining('multipart/form-data'),
        },
        method,
        body: formData,
      })

      expect(await (payload as any).body.get('a')).toBe('1')
      expect(await (payload as any).body.get('b')).toBe('2')
      expect(await (payload as any).body.get('file').text()).toBe('foo')
    })

    it('formData with message is ArrayBuffer', async () => {
      const formData = new FormData()
      formData.append('a', '1')
      formData.append('b', '2')
      formData.append('file', new File(['foo'], 'some-name.pdf', { type: 'application/pdf' }))

      const message = await encodeRequestMessage(198, 'REQUEST', {
        url,
        headers,
        method,
        body: formData,
      })

      expect(message).toBeInstanceOf(Blob)

      const [id, type, payload] = await decodeRequestMessage(await (message as any).arrayBuffer())

      expect(id).toBe(198)
      expect(type).toBe('REQUEST')
      expect(payload).toEqual({
        url,
        headers: {
          ...headers,
          'content-type': expect.stringContaining('multipart/form-data'),
        },
        method,
        body: formData,
      })

      expect(await (payload as any).body.get('a')).toBe('1')
      expect(await (payload as any).body.get('b')).toBe('2')
      expect(await (payload as any).body.get('file').text()).toBe('foo')
    })

    it('formData with message is ArrayBufferView', async () => {
      const formData = new FormData()
      formData.append('a', '1')
      formData.append('b', '2')
      formData.append('file', new File(['foo'], 'some-name.pdf', { type: 'application/pdf' }))

      const message = await encodeRequestMessage(198, 'REQUEST', {
        url,
        headers,
        method,
        body: formData,
      })

      expect(message).toBeInstanceOf(Blob)

      const [id, type, payload] = await decodeRequestMessage(new DataView(await (message as any).arrayBuffer()))

      expect(id).toBe(198)
      expect(type).toBe('REQUEST')
      expect(payload).toEqual({
        url,
        headers: {
          ...headers,
          'content-type': expect.stringContaining('multipart/form-data'),
        },
        method,
        body: formData,
      })

      expect(await (payload as any).body.get('a')).toBe('1')
      expect(await (payload as any).body.get('b')).toBe('2')
      expect(await (payload as any).body.get('file').text()).toBe('foo')
    })
  })
})

describe('encode/decode response message', () => {
  it('abort signal', async () => {
    const message = await encodeResponseMessage(198, 'ABORT_SIGNAL', undefined)

    expect(message).toBeTypeOf('string')

    const [id, type, payload] = await decodeResponseMessage(message)

    expect(id).toBe(198)
    expect(type).toBe('ABORT_SIGNAL')
    expect(payload).toBeUndefined()
  })

  it('event iterator', async () => {
    const message = await encodeResponseMessage(198, 'EVENT_ITERATOR', {
      event: 'message',
      data: 'hello',
      meta: {
        id: 'id-1',
        retry: 0,
        comments: [],
      },
    })

    expect(message).toBeTypeOf('string')

    const [id, type, payload] = await decodeResponseMessage(message)

    expect(id).toBe(198)
    expect(type).toBe('EVENT_ITERATOR')
    expect(payload).toEqual({
      event: 'message',
      data: 'hello',
      meta: {
        id: 'id-1',
        retry: 0,
        comments: [],
      },
    })
  })

  describe.each([
    [200, {}],
    [201, { 'x-custom-header': 'value' }],
    [400, {}],
  ] as const)('request', (status, headers) => {
    it('undefined', async () => {
      const message = await encodeResponseMessage(198, 'RESPONSE', {
        status,
        headers,
        body: undefined,
      })

      expect(message).toBeTypeOf('string')

      const [id, type, payload] = await decodeResponseMessage(message)

      expect(id).toBe(198)
      expect(type).toBe('RESPONSE')
      expect(payload).toEqual({
        status,
        headers,
        body: undefined,
      })
    })

    it('json', async () => {
      const message = await encodeResponseMessage(198, 'RESPONSE', {
        status,
        headers,
        body: { value: 1 },
      })

      expect(message).toBeTypeOf('string')

      const [id, type, payload] = await decodeResponseMessage(message)

      expect(id).toBe(198)
      expect(type).toBe('RESPONSE')
      expect(payload).toEqual({
        status,
        headers,
        body: { value: 1 },
      })
    })

    it('urlSearchParams', async () => {
      const query = new URLSearchParams('a=1&b=2')

      const message = await encodeResponseMessage(198, 'RESPONSE', {
        status,
        headers,
        body: query,
      })

      expect(message).toBeTypeOf('string')

      const [id, type, payload] = await decodeResponseMessage(message)

      expect(id).toBe(198)
      expect(type).toBe('RESPONSE')
      expect(payload).toEqual({
        status,
        headers: { ...headers, 'content-type': 'application/x-www-form-urlencoded' },
        body: query,
      })
    })

    it('event iterator', async () => {
      const message = await encodeResponseMessage(198, 'RESPONSE', {
        status,
        headers,
        body: (async function* () {})(),
      })

      expect(message).toBeTypeOf('string')

      const [id, type, payload] = await decodeResponseMessage(message)

      expect(id).toBe(198)
      expect(type).toBe('RESPONSE')
      expect(payload).toEqual({
        status,
        headers: { ...headers, 'content-type': 'text/event-stream' },
        body: undefined,
      })
    })

    it('blob', async () => {
      const blob = new Blob(['foo'], { type: 'application/pdf' })

      const message = await encodeResponseMessage(198, 'RESPONSE', {
        status,
        headers,
        body: blob,
      })

      expect(message).toBeInstanceOf(Blob)

      const [id, type, payload] = await decodeResponseMessage(message)

      expect(id).toBe(198)
      expect(type).toBe('RESPONSE')
      expect(payload).toEqual({
        status,
        headers: {
          ...headers,
          'content-type': 'application/pdf',
          'content-disposition': expect.any(String),
        },
        body: expect.toSatisfy(blob => blob instanceof Blob),
      })

      expect(await (payload as any).body.text()).toBe('foo')
    })

    it('blob with custom content-disposition', async () => {
      const blob = new Blob(['foo'], { type: 'application/pdf' })

      const message = await encodeResponseMessage(198, 'RESPONSE', {
        status,
        headers: {
          ...headers,
          'content-disposition': 'attachment; filename="some-name.pdf"',
        },
        body: blob,
      })

      expect(message).toBeInstanceOf(Blob)

      const [id, type, payload] = await decodeResponseMessage(message)

      expect(id).toBe(198)
      expect(type).toBe('RESPONSE')
      expect(payload).toEqual({
        status,
        headers: {
          ...headers,
          'content-type': 'application/pdf',
          'content-disposition': 'attachment; filename="some-name.pdf"',
        },
        body: expect.toSatisfy(blob => blob instanceof Blob),
      })

      expect(await (payload as any).body.text()).toBe('foo')
    })

    it('file', async () => {
      const file = new File(['foo'], 'some-name.pdf', { type: 'application/pdf' })

      const message = await encodeResponseMessage(198, 'RESPONSE', {
        status,
        headers,
        body: file,
      })

      expect(message).toBeInstanceOf(Blob)

      const [id, type, payload] = await decodeResponseMessage(message)

      expect(id).toBe(198)
      expect(type).toBe('RESPONSE')
      expect(payload).toEqual({
        status,
        headers: {
          ...headers,
          'content-type': 'application/pdf',
          'content-disposition': expect.any(String),
        },
        body: expect.toSatisfy(blob => blob instanceof Blob),
      })

      expect(await (payload as any).body.text()).toBe('foo')
    })

    it('file with custom content-disposition', async () => {
      const file = new File(['foo'], 'some-name.pdf', { type: 'application/pdf' })

      const message = await encodeResponseMessage(198, 'RESPONSE', {
        status,
        headers: {
          ...headers,
          'content-disposition': 'attachment',
        },
        body: file,
      })

      expect(message).toBeInstanceOf(Blob)

      const [id, type, payload] = await decodeResponseMessage(message)

      expect(id).toBe(198)
      expect(type).toBe('RESPONSE')
      expect(payload).toEqual({
        status,
        headers: {
          ...headers,
          'content-type': 'application/pdf',
          'content-disposition': 'attachment',
        },
        body: expect.toSatisfy(blob => blob instanceof Blob),
      })

      expect(await (payload as any).body.text()).toBe('foo')
    })

    it('formData', async () => {
      const formData = new FormData()
      formData.append('a', '1')
      formData.append('b', '2')
      formData.append('file', new File(['foo'], 'some-name.pdf', { type: 'application/pdf' }))

      const message = await encodeResponseMessage(198, 'RESPONSE', {
        status,
        headers,
        body: formData,
      })

      expect(message).toBeInstanceOf(Blob)

      const [id, type, payload] = await decodeResponseMessage(message)

      expect(id).toBe(198)
      expect(type).toBe('RESPONSE')
      expect(payload).toEqual({
        status,
        headers: {
          ...headers,
          'content-type': expect.stringContaining('multipart/form-data'),
        },
        body: formData,
      })

      expect(await (payload as any).body.get('a')).toBe('1')
      expect(await (payload as any).body.get('b')).toBe('2')
      expect(await (payload as any).body.get('file').text()).toBe('foo')
    })

    it('formData with message is ArrayBuffer', async () => {
      const formData = new FormData()
      formData.append('a', '1')
      formData.append('b', '2')
      formData.append('file', new File(['foo'], 'some-name.pdf', { type: 'application/pdf' }))

      const message = await encodeResponseMessage(198, 'RESPONSE', {
        status,
        headers,
        body: formData,
      })

      expect(message).toBeInstanceOf(Blob)

      const [id, type, payload] = await decodeResponseMessage(await (message as any).arrayBuffer())

      expect(id).toBe(198)
      expect(type).toBe('RESPONSE')
      expect(payload).toEqual({
        status,
        headers: {
          ...headers,
          'content-type': expect.stringContaining('multipart/form-data'),
        },
        body: formData,
      })

      expect(await (payload as any).body.get('a')).toBe('1')
      expect(await (payload as any).body.get('b')).toBe('2')
      expect(await (payload as any).body.get('file').text()).toBe('foo')
    })

    it('formData with message is ArrayBufferView', async () => {
      const formData = new FormData()
      formData.append('a', '1')
      formData.append('b', '2')
      formData.append('file', new File(['foo'], 'some-name.pdf', { type: 'application/pdf' }))

      const message = await encodeResponseMessage(198, 'RESPONSE', {
        status,
        headers,
        body: formData,
      })

      expect(message).toBeInstanceOf(Blob)

      const [id, type, payload] = await decodeResponseMessage(new DataView(await (message as any).arrayBuffer()))

      expect(id).toBe(198)
      expect(type).toBe('RESPONSE')
      expect(payload).toEqual({
        status,
        headers: {
          ...headers,
          'content-type': expect.stringContaining('multipart/form-data'),
        },
        body: formData,
      })

      expect(await (payload as any).body.get('a')).toBe('1')
      expect(await (payload as any).body.get('b')).toBe('2')
      expect(await (payload as any).body.get('file').text()).toBe('foo')
    })
  })
})
