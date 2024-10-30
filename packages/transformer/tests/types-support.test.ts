import { type ZodType, z } from 'zod'
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
  // {
  //   name: 'OpenAPITransformer multipart/form-data',
  //   createTransformer: (schema) =>
  //     new OpenAPITransformer({
  //       schema,
  //       serialize: { accept: 'multipart/form-data' },
  //     }),
  //   isFileSupport: true,
  // },
  // {
  //   name: 'OpenAPITransformer application/json',
  //   createTransformer: (schema) =>
  //     new OpenAPITransformer({
  //       schema,
  //       serialize: { accept: 'application/json' },
  //     }),
  //   isFileSupport: false,
  // },
  // {
  //   name: 'OpenAPITransformer application/www-form-urlencoded',
  //   createTransformer: (schema) =>
  //     new OpenAPITransformer({
  //       schema,
  //       serialize: { accept: 'application/www-form-urlencoded' },
  //     }),
  //   isFileSupport: false,
  // },
]

const types = [
  ['string', z.string()],
  [1234, z.number()],
  //  [ Number.NaN, z.nan()], // TODO: fix NaN on new Map as key
  [true, z.boolean()],
  [false, z.boolean()],
  [null, z.null()],
  [undefined, z.undefined()],
  [new Date('2023-01-01'), z.date()],
  [BigInt(1234), z.bigint()],
  [new Set([1, 2, 3]), z.set(z.number())],
  [
    new Map([
      [1, 2],
      [3, 4],
    ]),
    z.map(z.number(), z.number()),
  ],
  // [
  //   new File(['content of file'], 'file.txt', {
  //     type: 'application/json',
  //   }),
  //   z.instanceof(File),
  // ],
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
        data: origin,
        list: [origin],
        map: new Map([[origin, origin]]),
        set: new Set([origin]),
      }

      const transformer = createTransformer(
        z.object({
          data: schema,
          list: z.array(schema),
          map: z.map(schema, schema),
          set: z.set(schema),
        }),
      )

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
