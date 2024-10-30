import { ORPCTransformer } from '../src'

const transformers = [
  {
    name: 'ORPCTransformer full',
    transformer: new ORPCTransformer(),
    isFileSupport: true,
  },
]

const cases = [
  'string',
  1234,
  //   Number.NaN, // TODO: fix NaN on new Map as key
  true,
  false,
  null,
  undefined,
  new Date('2023-01-01'),
  BigInt(1234),
  new Set([1, 2, 3]),
  new Map([
    [1, 2],
    [3, 4],
  ]),
  new File(['content of file'], 'file.txt', {
    type: 'application/octet-stream',
  }),
  new File(['content of file 2'], 'file.txt', { type: 'application/pdf' }),
]

describe.each(transformers)(
  'types support for $name',
  ({ transformer, isFileSupport }) => {
    it.each(cases)('should work on flat: %s', async (origin) => {
      if (!isFileSupport && origin instanceof Blob) {
        return
      }

      const { body, headers } = transformer.serialize(origin)

      const request = new Request('http://localhost', {
        method: 'POST',
        headers,
        body,
      })

      const data = await transformer.deserialize(request)

      expect(data).toEqual(origin)
    })

    it.each(cases)('should work on nested object: %s', async (origin) => {
      if (!isFileSupport && origin instanceof Blob) {
        return
      }

      const object = {
        data: origin,
      }

      const { body, headers } = transformer.serialize(object)

      const request = new Request('http://localhost', {
        method: 'POST',
        headers,
        body,
      })

      const data = await transformer.deserialize(request)

      expect(data).toEqual(object)
    })

    it.each(cases)('should work on complex object: %s', async (origin) => {
      if (!isFileSupport && origin instanceof Blob) {
        return
      }

      const object = {
        data: origin,
        list: [origin],
        map: new Map([[origin, origin]]),
        set: new Set([origin]),
      }

      const { body, headers } = transformer.serialize(object)

      const request = new Request('http://localhost', {
        method: 'POST',
        headers,
        body,
      })

      const data = await transformer.deserialize(request)

      expect(data).toEqual(object)
    })
  },
)
