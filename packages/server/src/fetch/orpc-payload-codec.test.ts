import { ORPCPayloadCodec } from './orpc-payload-codec'

enum Test {
  A = 1,
  B = 2,
  C = 'C',
  D = 'D',
}

const types = [
  ['enum'],
  [Test.B],
  [Test.D],
  ['string'],
  ['string'],
  [1234],
  [1234],
  [Number.NaN],
  [true],
  [true],
  [false],
  [false],
  [null],
  [null],
  [undefined],
  [undefined],
  [new Date('2023-01-01')],
  [new Date('Invalid')],
  [new Date('Invalid')],
  [BigInt(1234)],
  [BigInt(1234)],
  [/uic/gi],
  [/npa|npb/gi],
  [/npa|npb/],
  [new URL('https://unnoq.com')],
  [
    { a: 1, b: 2, c: 3 },
  ],
  [[1, 2, 3]],
  [
    new Map([
      [1, 2],
      [3, 4],
    ]),
  ],
  [
    { a: [1, 2, 3], b: new Set([1, 2, 3]) },
  ],
  [
    new Map([
      [1, 2],
      [3, 4],
    ]),
  ],
  [
    new File(['"name"'], 'file.json', {
      type: 'application/json',
    }),
  ],
  [
    new File(['content of file'], 'file.txt', {
      type: 'application/octet-stream',
    }),
  ],
  [
    new File(['content of file 2'], 'file.pdf', { type: 'application/pdf' }),
  ],
] as const

describe('orpc-payload-codec', () => {
  const codec = new ORPCPayloadCodec()

  const encode = (data: unknown) => {
    const { body, headers } = codec.encode(data)
    return new Response(body, { headers })
  }

  it.each(types)('should work on flat: %s', async (origin) => {
    expect(
      await codec.decode(encode(origin)),
    )
      .toEqual(origin)
  })

  it.each(types)(
    'should work on nested object: %s',
    async (origin) => {
      const object = {
        data: origin,
      }

      expect(
        await codec.decode(encode(object)),
      )
        .toEqual(object)
    },
  )

  it.each(types)(
    'should work on complex object: %s',
    async (origin) => {
      const object = {
        '[]data\\]': origin,
        'list': [origin],
        'map': new Map([[origin, origin]]),
        'set': new Set([origin]),
      }
      expect(
        await codec.decode(encode(object)),
      )
        .toEqual(object)
    },
  )

  it.each(types)('should work with GET method: %s', async (origin) => {
    if (origin instanceof Blob) {
      return
    }

    const object = {
      '[]data\\]': origin,
      'list': [origin],
      'map': new Map([[origin, origin]]),
      'set': new Set([origin]),
    }

    const { query } = codec.encode(object, 'GET')

    const url = new URL('http://localhost?data=still&meta=work_when_conflict')

    if (query) {
      for (const [key, value] of query.entries()) {
        url.searchParams.append(key, value)
      }
    }

    const encoded = new Request(url)

    expect(
      await codec.decode(encoded),
    )
      .toEqual(object)
  })

  it('throw error when decode invalid payload', async () => {
    expect(codec.decode(new Response('invalid payload'))).rejects.toThrowError('Cannot parse request/response. Please check the request/response body and Content-Type header.')
  })

  it('use fallback method if method is GET and payload contain file', async () => {
    const payload = {
      file: new File([''], 'file.txt', { type: 'text/plain' }),
    }

    const { body, headers, method, query } = codec.encode(payload, 'GET')

    expect(method).toBe('POST')
    expect(body).toBeInstanceOf(FormData)
    expect(headers).toBeUndefined()
    expect(query).toBeUndefined()
  })

  it('force to use GET method if fallback method is GET', () => {
    const payload = {
      file: new File([''], 'file.txt', { type: 'text/plain' }),
      number: 123,
    }

    const { body, headers, method, query } = codec.encode(payload, 'GET', 'GET')

    expect(method).toBe('GET')
    expect(query).toBeInstanceOf(URLSearchParams)
    expect(query?.toString()).toBe('data=%7B%22file%22%3A%7B%7D%2C%22number%22%3A123%7D&meta=%5B%5D')
    expect(headers).toBeUndefined()
  })
})
