import { JSONSerializer } from '../../json-serializer'
import { OpenAPISerializer } from './openapi-serializer'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('openAPISerializer', () => {
  const jsonSerializer = new JSONSerializer()
  const serialize = vi.fn(v => jsonSerializer.serialize(v))

  const openapiSerializer = new OpenAPISerializer({
    jsonSerializer: {
      serialize,
    },
  })

  describe('.serialize', () => {
    it('with undefined', () => {
      expect(openapiSerializer.serialize(undefined)).toBeUndefined()
    })

    it('with blob', () => {
      const blob = new Blob()
      expect(openapiSerializer.serialize(blob)).toBe(blob)
    })

    it('with data', () => {
      const data = {
        date: new Date(),
        number: 123,
        nested: {
          date: new Date(),
        },
      }

      expect(openapiSerializer.serialize(data)).toBe(
        serialize.mock.results[0]!.value,
      )

      expect(serialize).toHaveBeenCalledOnce()
      expect(serialize).toHaveBeenCalledWith(data)
    })

    it('with data and blobs', async () => {
      const data = {
        date: new Date(),
        number: 123,
        nested: {
          date: new Date(),
        },
        blob: new Blob(['hello'], { type: 'text/plain' }),
      }

      const serialized = openapiSerializer.serialize(data)

      expect(serialized).toBeInstanceOf(FormData)
      expect((serialized as any).get('date')).toBe(data.date.toISOString())
      expect((serialized as any).get('number')).toBe(data.number.toString())
      expect((serialized as any).get('nested[date]')).toBe(data.nested.date.toISOString())
      expect((serialized as any).get('blob')).toBeInstanceOf(Blob)
      expect((serialized as any).get('blob').type).toBe('text/plain')
      expect(await (serialized as any).get('blob').text()).toBe('hello')

      expect(serialize).toHaveBeenCalledOnce()
      expect(serialize).toHaveBeenCalledWith(data)
    })
  })

  describe('.deserialize', () => {
    it('with undefined', () => {
      expect(openapiSerializer.deserialize(undefined)).toBeUndefined()
    })

    it('with blob', () => {
      const blob = new Blob()
      expect(openapiSerializer.deserialize(blob)).toBe(blob)
    })

    it('with data', () => {
      const data = {
        date: new Date(),
        number: 123,
        nested: {
          date: new Date(),
        },
      }
      expect(openapiSerializer.deserialize(data)).toBe(data)
    })

    it('with formdata', async () => {
      const data = {
        date: new Date(),
        number: 123,
        nested: {
          date: new Date(),
        },
        blob: new Blob(['hello'], { type: 'text/plain' }),
      }

      const serialized = new FormData()
      serialized.append('date', data.date.toString())
      serialized.append('number', data.number.toString())
      serialized.append('nested[date]', data.nested.date.toString())
      serialized.append('blob', data.blob)

      const deserialized = openapiSerializer.deserialize(serialized)

      expect(deserialized).toBeInstanceOf(Object)
      expect(deserialized).toEqual({
        date: data.date.toString(),
        number: data.number.toString(),
        nested: {
          date: data.nested.date.toString(),
        },
        blob: expect.any(File),
      })

      expect((deserialized as any).blob.name).toBe('blob')
      expect((deserialized as any).blob.type).toBe('text/plain')
      expect(await (deserialized as any).blob.text()).toBe('hello')
    })

    it('with URLSearchParams', async () => {
      const data = {
        date: new Date().toString(),
        nested: {
          date: new Date().toString(),
        },
      }

      const serialized = new URLSearchParams()
      serialized.append('date', data.date)
      serialized.append('nested[date]', data.nested.date)

      const deserialized = openapiSerializer.deserialize(serialized)

      expect(deserialized).toBeInstanceOf(Object)
      expect(deserialized).toEqual(data)
    })
  })

  it('fallback to JSONSerializer', async () => {
    const openapiSerializer = new OpenAPISerializer()
  })
})
