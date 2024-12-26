import { OpenAPIPayloadCodec } from './openapi-payload-codec'

describe('openAPIPayloadCodec', () => {
  const codec = new OpenAPIPayloadCodec()

  describe('encode', () => {
    it('should encode JSON data when accept header is application/json', async () => {
      const payload = { name: 'test', age: 25 }
      const result = codec.encode(payload, 'application/json') as any

      expect(result).toBeInstanceOf(Blob)
      expect(result?.type).toBe('application/json')

      const text = await result?.text()
      expect(JSON.parse(text!)).toEqual(payload)
    })

    it('should handle undefined payload for JSON', () => {
      const result = codec.encode(undefined, 'application/json')
      expect(result).toBeUndefined()
    })

    it('should encode FormData when accept header is multipart/form-data', () => {
      const payload = {
        name: 'test',
        file: new Blob(['test content'], { type: 'text/plain' }),
      }
      const result = codec.encode(payload, 'multipart/form-data')

      expect(result).toBeInstanceOf(FormData)
      const formData = result as FormData
      expect(formData.get('name')).toBe('test')
      expect(formData.get('file')).toBeInstanceOf(Blob)
    })

    it('should encode URL params when accept header is application/x-www-form-urlencoded', async () => {
      const payload = { name: 'test', age: 25 }
      const result = codec.encode(payload, 'application/x-www-form-urlencoded') as any

      expect(result).toBeInstanceOf(Blob)
      expect(result?.type).toBe('application/x-www-form-urlencoded')

      const text = await result?.text()
      expect(text).toBe('name=test&age=25')
    })

    it('should throw NOT_ACCEPTABLE error for unsupported content type', () => {
      expect(() => codec.encode({ test: 'data' }, 'invalid/type')).toThrow('Unsupported content-type: invalid/type')
    })
  })

  describe('decode', () => {
    it('should decode JSON response', async () => {
      const payload = { name: 'test', age: 25 }
      const response = new Response(JSON.stringify(payload), {
        headers: { 'Content-Type': 'application/json' },
      })

      const result = await codec.decode(response)
      expect(result).toEqual(payload)
    })

    it('should decode form-urlencoded data', async () => {
      const params = new URLSearchParams()
      params.append('name', 'test')
      params.append('age', '25')

      const result = await codec.decode(params)
      expect(result).toEqual({ name: 'test', age: '25' })
    })

    it('should decode multipart form data', async () => {
      const formData = new FormData()
      formData.append('name', 'test')
      formData.append('file', new Blob(['content'], { type: 'text/plain' }))

      const response = new Response(formData)

      const result = await codec.decode(response)
      expect(result).toHaveProperty('name', 'test')
      expect(result).toHaveProperty('file')
    })

    it('should handle file downloads with Content-Disposition', async () => {
      const blob = new Blob(['test content'], { type: 'text/plain' })
      const response = new Response(blob, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': 'attachment; filename="test.txt"',
        },
      })

      const result = await codec.decode(response) as File
      expect(result).toBeInstanceOf(File)
      expect(result.name).toBe('test.txt')
      expect(result.type).toBe('text/plain')
    })

    it('should decode plain text response', async () => {
      const response = new Response('test content', {
        headers: { 'Content-Type': 'text/plain' },
      })

      const result = await codec.decode(response)
      expect(result).toBe('test content')
    })

    it('should handle empty response body', async () => {
      const response = new Response(null, {
        headers: { 'Content-Type': 'application/json' },
      })

      const result = await codec.decode(response)
      expect(result).toBeUndefined()
    })
  })
})
