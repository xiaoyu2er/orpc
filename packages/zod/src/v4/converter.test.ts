import type { JSONSchema } from '@orpc/openapi'
import * as z from 'zod4'
import { ZodToJsonSchemaConverter } from './converter'

type SchemaTestCase = {
  schema: z.ZodType
  input: [boolean, Exclude<JSONSchema, boolean>]
  output?: [boolean, Exclude<JSONSchema, boolean>]
}

const stringCases: SchemaTestCase[] = [
  {
    schema: z.string(),
    input: [true, { type: 'string' }],
  },
  {
    schema: z.string().min(5).max(10).regex(/^[a-z\\]+$/),
    input: [true, { type: 'string', maxLength: 10, minLength: 5, pattern: '^[a-z\\\\]+$' }],
  },
  {
    schema: z.base64(),
    input: [true, { type: 'string', contentEncoding: 'base64' }],
  },
  {
    schema: z.cuid(),
    input: [true, { type: 'string', pattern: '^[cC][^\\s-]{8,}$' }],
  },
  {
    schema: z.email(),
    input: [true, { type: 'string', format: 'email' }],
  },
  {
    schema: z.url(),
    input: [true, { type: 'string', format: 'uri' }],
  },
  {
    schema: z.uuid(),
    input: [true, { type: 'string', format: 'uuid' }],
  },
  {
    schema: z.string().length(6),
    input: [true, { type: 'string', minLength: 6, maxLength: 6 }],
  },
  {
    schema: z.string().includes('a\\'),
    input: [true, { type: 'string', pattern: 'a\\\\' }],
  },
  {
    schema: z.string().startsWith('a\\'),
    input: [true, { type: 'string', pattern: '^a\\\\.*' }],
  },
  {
    schema: z.string().endsWith('a\\'),
    input: [true, { type: 'string', pattern: '.*a\\\\$' }],
  },
  {
    schema: z.emoji(),
    input: [true, { type: 'string', pattern: '^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$' }],
  },
  {
    schema: z.nanoid(),
    input: [true, { type: 'string', pattern: '^[a-zA-Z0-9_-]{21}$' }],
  },
  {
    schema: z.cuid2(),
    input: [true, { type: 'string', pattern: '^[0-9a-z]+$' }],
  },
  {
    schema: z.ulid(),
    input: [true, {
      type: 'string',
      pattern: '^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$',
    }],
  },
  {
    schema: z.iso.datetime(),
    input: [true, { type: 'string', format: 'date-time' }],
  },
  {
    schema: z.iso.date(),
    input: [true, { type: 'string', format: 'date' }],
  },
  {
    schema: z.iso.time(),
    input: [true, { type: 'string', format: 'time' }],
  },
  {
    schema: z.iso.duration(),
    input: [true, { type: 'string', format: 'duration' }],
  },
  {
    schema: z.ipv4(),
    input: [true, { type: 'string', format: 'ipv4' }],
  },
  {
    schema: z.ipv6(),
    input: [true, {
      type: 'string',
      format: 'ipv6',
    }],
  },
  {
    schema: z.jwt(),
    input: [true, { type: 'string', pattern: '^[\\w-]+\\.[\\w-]+\\.[\\w-]+$' }],
  },
  {
    schema: z.base64url(),
    input: [true, { type: 'string', pattern: '^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$' }],
  },
  {
    schema: z.string().trim(),
    input: [true, { type: 'string' }],
  },
]

const numberCases: SchemaTestCase[] = [
  {
    schema: z.number(),
    input: [true, { type: 'number' }],
  },
  {
    schema: z.number().int(),
    input: [true, { type: 'integer' }],
  },
  {
    schema: z.number().min(0).max(100).int(),
    input: [true, { type: 'integer', minimum: 0, maximum: 100 }],
  },
  {
    schema: z.number().multipleOf(5),
    input: [true, { type: 'number', multipleOf: 5 }],
  },
  {
    schema: z.number(),
    input: [true, { type: 'number' }],
  },
  {
    schema: z.bigint(),
    input: [true, { type: 'string', pattern: '^-?[0-9]+$' }],
  },
  {
    schema: z.nan(),
    input: [true, { not: {} }],
    output: [true, { type: 'null' }],
  },
]

enum ExampleEnum {
  A = 'a',
  B = 'b',
}

const nativeCases: SchemaTestCase[] = [
  {
    schema: z.boolean(),
    input: [true, { type: 'boolean' }],
  },
  {
    schema: z.date(),
    input: [true, { type: 'string', format: 'date-time' }],
  },
  {
    schema: z.null(),
    input: [true, { type: 'null' }],
  },
  {
    schema: z.any(),
    input: [false, { }],
  },
  {
    schema: z.unknown(),
    input: [false, {}],
  },
  {
    schema: z.undefined(),
    input: [false, { not: {} }],
  },
  {
    schema: z.void(),
    input: [false, { not: {} }],
  },
  {
    schema: z.literal(1234),
    input: [true, { const: 1234 }],
  },
  {
    schema: z.literal(undefined),
    input: [false, { not: {} }],
  },
  {
    schema: z.enum(['a', 'b']),
    input: [true, { enum: ['a', 'b'] }],
  },
  {
    schema: z.nativeEnum(ExampleEnum),
    input: [true, { enum: ['a', 'b'] }],
  },
]

const combinationCases: SchemaTestCase[] = [
  {
    schema: z.union([z.string(), z.number()]),
    input: [true, { anyOf: [{ type: 'string' }, { type: 'number' }] }],
  },
  {
    schema: z.union([z.string(), z.number().optional()]),
    input: [false, { anyOf: [{ type: 'string' }, { type: 'number' }] }],
  },
  {
    schema: z.union([z.string(), z.undefined()]),
    input: [false, { type: 'string' }],
  },
  {
    schema: z.intersection(z.string(), z.number()),
    input: [true, { allOf: [{ type: 'string' }, { type: 'number' }] }],
  },
  {
    schema: z.intersection(z.string().optional(), z.number().optional()),
    input: [false, { allOf: [{ type: 'string' }, { type: 'number' }] }],
  },
]

const processedCases: SchemaTestCase[] = [
  {
    schema: z.lazy(() => z.object({ value: z.string() })),
    input: [true, { type: 'object', properties: { value: { type: 'string' } }, required: ['value'] }],
  },
  {
    schema: z.lazy(() => z.object({ value: z.lazy(() => z.string()) })),
    input: [true, { type: 'object', properties: { value: { } } }],
  },
  {
    schema: z.string().transform(x => x),
    input: [true, { type: 'string' }],
    output: [false, {}],
  },
  {
    schema: z.string().refine(x => x.length > 0, 'not empty'),
    input: [true, { type: 'string' }],
  },
  {
    schema: z.preprocess(x => x, z.string()),
    input: [true, { type: 'string' }],
  },
  {
    schema: z.number().catch(1),
    input: [true, { type: 'number' }],
  },
  {
    schema: z.number().brand<'CAT'>(),
    input: [true, { type: 'number' }],
  },
  {
    schema: z.number().brand<'CAT'>(),
    input: [true, { type: 'number' }],
  },
  // {
  //   schema: z.pipeline(z.number(), z.string()),
  //   input: [true, { type: 'number' }],
  //   output: [true, { type: 'string' }],
  // },
  {
    schema: z.string().nullable(),
    input: [true, { anyOf: [{ type: 'null' }, { type: 'string' }] }],
  },
  {
    schema: z.string().default('a'),
    input: [false, { default: 'a', type: 'string' }],
  },
  {
    schema: z.number().readonly(),
    input: [true, { type: 'number', readOnly: true }],
  },
]

const unsupportedCases: SchemaTestCase[] = [
  {
    schema: z.promise(z.string()),
    input: [true, { not: {} }],
  },
  {
    schema: z.symbol(),
    input: [true, { not: {} }],
  },
  // {
  //   schema: z.function(),
  //   input: [true, { not: {} }],
  //   ignoreZodToJsonSchema: true,
  // },
  {
    schema: z.never(),
    input: [true, { not: {} }],
  },
]

// const extendSchemaCases: SchemaTestCase[] = [
//   {
//     schema: file(),
//     input: [true, { type: 'string', contentMediaType: '*/*' }],
//     ignoreZodToJsonSchema: true,
//   },
//   {
//     schema: file().type('image/png'),
//     input: [true, { type: 'string', contentMediaType: 'image/png' }],
//     ignoreZodToJsonSchema: true,
//   },
//   {
//     schema: blob(),
//     input: [true, { type: 'string', contentMediaType: '*/*' }],
//     ignoreZodToJsonSchema: true,
//   },
//   {
//     schema: regexp(),
//     input: [true, { type: 'string', pattern: '^\\/(.*)\\/([a-z]*)$' }],
//     ignoreZodToJsonSchema: true,
//   },
//   {
//     schema: url(),
//     input: [true, { type: 'string', format: 'uri' }],
//     ignoreZodToJsonSchema: true,
//   },
//   {
//     schema: customJsonSchema(z.string(), { examples: ['a', 'b'] }),
//     input: [true, { type: 'string', examples: ['a', 'b'] }],
//     ignoreZodToJsonSchema: true,
//   },
//   {
//     schema: customJsonSchema(
//       customJsonSchema(
//         customJsonSchema(z.string(), { examples: ['both'] }),
//         { examples: ['input'] },
//         { strategy: 'input' },
//       ),
//       { examples: ['output'] },
//       { strategy: 'output' },
//     ),
//     input: [true, { type: 'string', examples: ['input'] }],
//     output: [true, { type: 'string', examples: ['output'] }],
//     ignoreZodToJsonSchema: true,
//   },
//   {
//     schema: z.string().describe('description'),
//     input: [true, { type: 'string', description: 'description' }],
//     ignoreZodToJsonSchema: true,
//   },
// ]

const edgeCases: SchemaTestCase[] = [
  {
    schema: z.array(z.string()).nonempty(),
    input: [true, { type: 'array', items: { type: 'string' }, minItems: 1 }],
  },
  {
    schema: z.array(z.string()).min(10).max(20),
    input: [true, { type: 'array', items: { type: 'string' }, minItems: 10, maxItems: 20 }],
  },
  {
    schema: z.array(z.string()).length(10),
    input: [true, { type: 'array', items: { type: 'string' }, minItems: 10, maxItems: 10 }],
  },
  {
    schema: z.object({ value: z.string() }).strict(),
    input: [true, { type: 'object', properties: { value: { type: 'string' } }, required: ['value'], additionalProperties: false }],
  },
  {
    schema: z.object({ value: z.string() }).catchall(z.number()),
    input: [true, { type: 'object', properties: { value: { type: 'string' } }, required: ['value'], additionalProperties: { type: 'number' } }],
  },
  {
    schema: z.record(z.number(), z.string()),
    input: [true, { type: 'object', additionalProperties: { type: 'string' }, propertyNames: { type: 'number' } }],
  },
  {
    schema: z.record(z.string().date(), z.string()),
    input: [true, { type: 'object', additionalProperties: { type: 'string' }, propertyNames: { type: 'string', format: 'date' } }],
  },
]

describe.each([
  ...stringCases,
  ...numberCases,
  // ...nativeCases,
  // ...combinationCases,
  // ...processedCases,
  // ...extendSchemaCases,
  // ...unsupportedCases,
  // ...edgeCases,
])('zodToJsonSchemaConverter.convert %#', ({ schema, input, output = input }) => {
  describe.each([['input'], ['output']] as const)('strategy: %s', (strategy) => {
    const converter = new ZodToJsonSchemaConverter({ maxLazyDepth: 1 })

    const [expectedRequired, expectedJson] = strategy === 'input' ? input : output
    const arrayItemJsonSchema = expectedRequired
      ? expectedJson
      : strategy === 'input'
        ? { anyOf: [expectedJson, { not: {} }] }
        : { anyOf: [expectedJson, { type: 'null' }] }

    it('flat', async () => {
      const [required, json] = await converter.convert(schema, { strategy })

      expect(required).toEqual(expectedRequired)
      expect(json).toEqual(expectedJson)
    })

    it('object', async () => {
      const testSchema = z.object({ value: schema })
      const [required, json] = await converter.convert(testSchema, { strategy })

      expect(required).toEqual(true)
      expect(json).toEqual({
        type: 'object',
        properties: {
          value: expectedJson,
        },
        required: expectedRequired ? ['value'] : undefined,
      })
    })

    it('array', async () => {
      const testSchema = z.array(schema)
      const [required, json] = await converter.convert(testSchema, { strategy })

      expect(required).toEqual(true)
      expect(json).toEqual({
        type: 'array',
        items: arrayItemJsonSchema,
      })
    })

    it('tuple', async () => {
      const testSchema = z.tuple([schema, schema]).rest(schema)
      const [required, json] = await converter.convert(testSchema, { strategy })

      expect(required).toEqual(true)
      expect(json).toEqual({
        type: 'array',
        prefixItems: [
          arrayItemJsonSchema,
          arrayItemJsonSchema,
        ],
        items: arrayItemJsonSchema,
      })
    })

    it('set', async () => {
      const testSchema = z.set(schema)
      const [required, json] = await converter.convert(testSchema, { strategy })

      expect(required).toEqual(true)
      expect(json).toEqual({
        type: 'array',
        uniqueItems: true,
        items: arrayItemJsonSchema,
      })
    })

    it('map', async () => {
      const testSchema = z.map(schema, schema.optional())
      const [required, json] = await converter.convert(testSchema, { strategy })

      expect(required).toEqual(true)
      expect(json).toEqual({
        type: 'array',
        items: {
          type: 'array',
          maxItems: 2,
          minItems: 2,
          prefixItems: [
            arrayItemJsonSchema,
            strategy === 'input' ? expectedJson : { anyOf: [expectedJson, { type: 'null' }] },
          ],
        },
      })
    })

    it('record', async () => {
      const testSchema = z.record(z.string().regex(/^\d+$/), schema)
      const [required, json] = await converter.convert(testSchema, { strategy })

      expect(required).toEqual(true)
      expect(json).toEqual({
        type: 'object',
        additionalProperties: expectedJson,
        propertyNames: { type: 'string', pattern: '^\\d+$' },
      })
    })
  })
})

it('zodToJsonSchemaConverter.condition', async () => {
  const converter = new ZodToJsonSchemaConverter()
  expect(converter.condition(z.string())).toBe(true)
  expect(converter.condition(z.string().optional())).toBe(true)

  const v = await import('valibot')

  expect(converter.condition(v.string())).toBe(false)
})
