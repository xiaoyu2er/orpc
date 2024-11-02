import { type ZodType, object, z } from 'zod'
import { ORPCTransformer, OpenAPITransformer, type Transformer } from '../src'

const transformers: {
  name: string
  createTransformer: (schema: ZodType<any, any, any>) => Transformer
  isFileSupport: boolean
}[] = [
  {
    name: 'ORPCTransformer',
    createTransformer: () => new ORPCTransformer(),
    isFileSupport: true,
  },
  {
    name: 'OpenAPITransformer auto',
    createTransformer: (schema) => new OpenAPITransformer({ schema }),
    isFileSupport: true,
  },
  {
    name: 'OpenAPITransformer multipart/form-data',
    createTransformer: (schema) =>
      new OpenAPITransformer({
        schema,
        serialize: { accept: 'multipart/form-data' },
      }),
    isFileSupport: true,
  },
  {
    name: 'OpenAPITransformer application/json',
    createTransformer: (schema) =>
      new OpenAPITransformer({
        schema,
        serialize: { accept: 'application/json' },
      }),
    isFileSupport: false,
  },
  {
    name: 'OpenAPITransformer application/www-form-urlencoded',
    createTransformer: (schema) =>
      new OpenAPITransformer({
        schema,
        serialize: { accept: 'application/www-form-urlencoded' },
      }),
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
  [Number.NaN, z.nan()], // TODO: fix NaN on new Map as key
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
  [BigInt(1234), z.bigint()],
  [BigInt(1234), z.literal(BigInt(1234))],
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

describe.each(transformers)('$name', ({ createTransformer, isFileSupport }) => {
  it.each(types)('should work on flat: %s', async (origin, schema) => {
    if (!isFileSupport && origin instanceof Blob) {
      return
    }

    const transformer = createTransformer(schema)

    const { body, headers } = transformer.serialize(origin)

    const request = new Request('http://localhost', {
      method: 'POST',
      headers,
      body,
    })

    const data = await transformer.deserialize(request)

    expect(data).toEqual(origin)
  })

  it.each(types)('should work on nested object: %s', async (origin, schema) => {
    if (!isFileSupport && origin instanceof Blob) {
      return
    }

    const object = {
      data: origin,
    }

    const transformer = createTransformer(z.object({ data: schema }))

    const { body, headers } = transformer.serialize(object)

    const request = new Request('http://localhost', {
      method: 'POST',
      headers,
      body,
    })

    const data = await transformer.deserialize(request)

    expect(data).toEqual(object)
  })

  it.each(types)(
    'should work on complex object: %s',
    async (origin, schema) => {
      if (!isFileSupport && origin instanceof Blob) {
        return
      }

      const object = {
        '[]data\\]': origin,
        list: [origin],
        map: new Map([[origin, origin]]),
        set: new Set([origin]),
      }

      const objectSchema = z.object({
        '[]data\\]': schema,
        list: z.array(schema),
        map: z.map(schema, schema),
        set: z.set(schema),
      })

      const transformer = createTransformer(objectSchema)

      const { body, headers } = transformer.serialize(object)

      const request = new Request('http://localhost', {
        method: 'POST',
        headers,
        body,
      })

      const data = await transformer.deserialize(request)

      expect(data).toEqual(object)
    },
  )
})
