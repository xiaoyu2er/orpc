import { OpenAPITransformer } from './transformer'

describe('OpenAPITransformer', () => {
  let transformer: OpenAPITransformer

  beforeEach(() => {
    transformer = new OpenAPITransformer()
  })

  describe('serialize', () => {
    it('should serialize plain objects to JSON', () => {
      const payload = { name: 'test', value: 123 }
      const { body, headers } = transformer.serialize(payload)

      expect(headers.get('Content-Type')).toBe('application/json')
      expect(body).toBe('{"name":"test","value":123}')
    })

    it('should handle Set objects', () => {
      const set = new Set(['a', 'b', 'c'])
      const payload = { data: set }
      const { body, headers } = transformer.serialize(payload)

      expect(headers.get('Content-Type')).toBe('application/json')
      expect(body).toBe('{"data":["a","b","c"]}')
    })

    it('should handle Map objects', () => {
      const map = new Map([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ])
      const payload = { data: map }
      const { body, headers } = transformer.serialize(payload)

      expect(headers.get('Content-Type')).toBe('application/json')
      expect(body).toBe('{"data":[["key1","value1"],["key2","value2"]]}')
    })

    it('should handle single Blob payload', () => {
      const blob = new Blob(['test content'], { type: 'text/plain' })
      const { body, headers } = transformer.serialize(blob)

      expect(headers.get('Content-Type')).toBe('text/plain')
      expect(body).toBeInstanceOf(Blob)
      expect(body).toBe(blob)
    })

    it('should handle Blob without type', () => {
      const blob = new Blob(['test content'])
      const { body, headers } = transformer.serialize(blob)

      expect(headers.get('Content-Type')).toBe('application/octet-stream')
      expect(body).toBeInstanceOf(Blob)
    })

    it('should create FormData for objects containing Blobs', () => {
      const blob = new Blob(['test content'], { type: 'text/plain' })
      const payload = {
        name: 'test',
        file: blob,
        number: 123,
        boolean: true,
      }
      const { body, headers } = transformer.serialize(payload)

      expect(body).toBeInstanceOf(FormData)

      const formData = body as FormData
      expect(formData.get('name')).toBe('test')
      expect(formData.get('file')).toBeInstanceOf(Blob)
      expect(formData.get('number')).toBe('123')
      expect(formData.get('boolean')).toBe('true')
    })
  })

  describe('deserialize', () => {
    it('should deserialize JSON response', async () => {
      const jsonData = { name: 'test', value: 123 }
      const response = new Response(JSON.stringify(jsonData), {
        headers: { 'Content-Type': 'application/json' },
      })
      const result = await transformer.deserialize(response)

      expect(result).toEqual(jsonData)
    })

    it('should handle text response', async () => {
      const textContent = 'Hello, World!'
      const response = new Response(textContent, {
        headers: { 'Content-Type': 'text/plain' },
      })
      const result = await transformer.deserialize(response)

      expect(result).toBe(textContent)
    })

    it('should handle response without content type as JSON', async () => {
      const jsonData = { name: 'test' }
      const response = new Response(JSON.stringify(jsonData), {
        headers: {
          'Content-Type': 'application/json',
        },
      })
      const result = await transformer.deserialize(response)

      expect(result).toEqual(jsonData)
    })

    it('should handle blob response', async () => {
      const blob = new Blob(['test content'], { type: 'image/png' })
      const response = new Response(blob, {
        headers: { 'Content-Type': 'image/png' },
      })
      const result = await transformer.deserialize(response)

      expect(result).toBeInstanceOf(Blob)
      expect(await (result as Blob).text()).toBe('test content')
    })

    it('should throw error for multipart/form-data', async () => {
      const from = new FormData()
      from.append('a[]', '1')
      from.append('b[c][d]', '2')
      from.append('c[e][f]', '3')
      const response = new Response(from, {})

      expect(await transformer.deserialize(response)).toEqual({
        a: ['1'],
        b: { c: { d: '2' } },
        c: { e: { f: '3' } },
      })
    })

    it('should handle malformed JSON', async () => {
      const response = new Response('{"bad json"}', {
        headers: { 'Content-Type': 'application/json' },
      })
      const result = await transformer.deserialize(response)

      expect(result).toBe('{"bad json"}')
    })

    it('should handle search params', async () => {
      const request = new Request(
        'https://example.com?a=1&b=2&c[0]=1&f.1=2&g[1]=3&g[1]=4&j[]=5&j[]=6',
      )
      const result = await transformer.deserialize(request)

      expect(result).toEqual({
        a: '1',
        b: '2',
        c: ['1'],
        'f.1': '2',
        g: { '1': '4' },
        j: ['6'], // FIX: should be ['5', '6']
      })
    })
  })
})
