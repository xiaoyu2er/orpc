import { oz } from '@orpc/zod'
import { object, z, type ZodType } from 'zod'
import {
  type Deserializer,
  OpenAPIDeserializer,
  OpenAPISerializer,
  ORPCDeserializer,
  ORPCSerializer,
  type Serializer,
} from '../src'

const transformers: {
  name: string
  createSerializer: () => Serializer
  createDeserializer: (schema: ZodType<any, any, any>) => Deserializer
  isFileSupport: boolean
}[] = [
  {
    name: 'ORPCTransformer',
    createSerializer: () => new ORPCSerializer(),
    createDeserializer: () => new ORPCDeserializer(),
    isFileSupport: true,
  },
  {
    name: 'OpenAPITransformer auto',
    createSerializer: () => new OpenAPISerializer(),
    createDeserializer: schema => new OpenAPIDeserializer({ schema }),
    isFileSupport: true,
  },
  {
    name: 'OpenAPITransformer multipart/form-data',
    createSerializer: () =>
      new OpenAPISerializer({ accept: 'multipart/form-data' }),
    createDeserializer: schema => new OpenAPIDeserializer({ schema }),
    isFileSupport: true,
  },
  {
    name: 'OpenAPITransformer application/json',
    createSerializer: () =>
      new OpenAPISerializer({ accept: 'application/json' }),
    createDeserializer: schema => new OpenAPIDeserializer({ schema }),
    isFileSupport: false,
  },
  {
    name: 'OpenAPITransformer application/x-www-form-urlencoded',
    createSerializer: () =>
      new OpenAPISerializer({ accept: 'application/x-www-form-urlencoded' }),
    createDeserializer: schema => new OpenAPIDeserializer({ schema }),
    isFileSupport: false,
  },
]

enum Test {
  A = 1,
  B = 2,
  C = 'C',
  D = 'D',
}

const types = [
  ['enum', z.enum(['enum', 'enum2'])],
  [Test.B, z.nativeEnum(Test)],
  [Test.D, z.nativeEnum(Test)],
  ['string', z.string()],
  ['string', z.literal('string').or(object({}))],
  [1234, z.number().or(object({}))],
  [1234, z.literal(1234)],
  [Number.NaN, z.nan()],
  [true, z.boolean()],
  [true, z.literal(true)],
  [false, z.boolean()],
  [false, z.literal(false)],
  [null, z.null()],
  [null, z.literal(null)],
  [undefined, z.undefined()],
  [undefined, z.literal(undefined)],
  [new Date('2023-01-01'), z.date()],
  [new Date('Invalid'), z.date().catch(new Date('1970-01-01'))], // zod not support invalid date so we use a catch
  [new Date('Invalid'), oz.invalidDate()], // zod not support invalid date so we use a catch
  [BigInt(1234), z.bigint()],
  [BigInt(1234), z.literal(BigInt(1234))],
  [/uic/gi, oz.regexp()],
  [/npa|npb/gi, oz.regexp()],
  [new URL('https://unnoq.com'), oz.url()],
  [
    { a: 1, b: 2, c: 3 },
    z.object({ a: z.number(), b: z.number(), c: z.number() }),
  ],
  [[1, 2, 3], z.array(z.number())],
  [new Set([1, 2, 3]), z.set(z.number())],
  [
    new Map([
      [1, 2],
      [3, 4],
    ]),
    z.map(z.number(), z.number()),
  ],
  [
    { a: [1, 2, 3], b: new Set([1, 2, 3]) },
    z
      .object({ a: z.array(z.number()) })
      .and(z.object({ b: z.set(z.number()) })),
  ],
  [
    new Map([
      [1, 2],
      [3, 4],
    ]),
    z.map(z.number(), z.number()),
  ],
  [
    new File(['"name"'], 'file.json', {
      type: 'application/json',
    }),
    z.instanceof(File),
  ],
  [
    new File(['content of file'], 'file.txt', {
      type: 'application/octet-stream',
    }),
    z.instanceof(Blob),
  ],
  [
    new File(['content of file 2'], 'file.pdf', { type: 'application/pdf' }),
    z.instanceof(Blob),
  ],
] as const

describe.each(transformers)(
  '$name',
  ({ createSerializer, createDeserializer, isFileSupport }) => {
    it.each(types)('should work on flat: %s', async (origin, schema) => {
      if (!isFileSupport && origin instanceof Blob) {
        return
      }

      const serializer = createSerializer()
      const deserializer = createDeserializer(schema)

      const { body, headers } = serializer.serialize(origin)

      const request = new Request('http://localhost', {
        method: 'POST',
        headers,
        body,
      })

      const data = await deserializer.deserialize(request)

      expect(data).toEqual(origin)
    })

    it.each(types)(
      'should work on nested object: %s',
      async (origin, schema) => {
        if (!isFileSupport && origin instanceof Blob) {
          return
        }

        const object = {
          data: origin,
        }

        const serializer = createSerializer()
        const deserializer = createDeserializer(z.object({ data: schema }))

        const { body, headers } = serializer.serialize(object)

        const request = new Request('http://localhost', {
          method: 'POST',
          headers,
          body,
        })

        const data = await deserializer.deserialize(request)

        expect(data).toEqual(object)
      },
    )

    it.each(types)(
      'should work on complex object: %s',
      async (origin, schema) => {
        if (!isFileSupport && origin instanceof Blob) {
          return
        }

        const object = {
          '[]data\\]': origin,
          'list': [origin],
          'map': new Map([[origin, origin]]),
          'set': new Set([origin]),
        }

        const objectSchema = z.object({
          '[]data\\]': schema,
          'list': z.array(schema),
          'map': z.map(schema, schema),
          'set': z.set(schema),
        })

        const serializer = createSerializer()
        const deserializer = createDeserializer(objectSchema)

        const { body, headers } = serializer.serialize(object)

        const request = new Request('http://localhost', {
          method: 'POST',
          headers,
          body,
        })

        const data = await deserializer.deserialize(request)

        expect(data).toEqual(object)
      },
    )
  },
)
