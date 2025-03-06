import type { JSONSchema } from 'json-schema-typed'
import type { ZodTypeAny } from 'zod'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { ZodToJsonSchemaConverter } from './converter'
import { blob } from './schemas/blob'
import { file } from './schemas/file'
import { regexp } from './schemas/regexp'
import { url } from './schemas/url'

const cases: { schema: ZodTypeAny, input: [boolean, JSONSchema], output?: [boolean, JSONSchema], ignoreZodToJsonSchema?: boolean }[] = [
  {
    schema: z.string(),
    input: [true, { type: 'string' }],
  },
  {
    schema: z.string().min(5).max(10).regex(/^[a-z\\]+$/),
    input: [true, { type: 'string', maxLength: 10, minLength: 5, pattern: '^[a-z\\\\]+$' }],
  },
  {
    schema: z.string().base64(),
    input: [true, { type: 'string', contentEncoding: 'base64' }],
  },
  {
    schema: z.string().cuid(),
    input: [true, { type: 'string', pattern: '^[0-9A-HJKMNP-TV-Z]{26}$' }],
    ignoreZodToJsonSchema: true,
  },
  {
    schema: z.string().email(),
    input: [true, { type: 'string', format: 'email' }],
  },
  {
    schema: z.string().url(),
    input: [true, { type: 'string', format: 'uri' }],
  },
  {
    schema: z.string().uuid(),
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
    input: [true, { type: 'string', pattern: '^a\\\\' }],
  },
  {
    schema: z.string().endsWith('a\\'),
    input: [true, { type: 'string', pattern: 'a\\\\$' }],
  },
  {
    schema: z.string().emoji(),
    input: [true, { type: 'string', pattern: '^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$' }],
  },
  {
    schema: z.string().nanoid(),
    input: [true, { type: 'string', pattern: '^[a-zA-Z0-9_-]{21}$' }],
  },
  {
    schema: z.string().cuid2(),
    input: [true, { type: 'string', pattern: '^[0-9a-z]+$' }],
  },
  {
    schema: z.string().ulid(),
    input: [true, { type: 'string', pattern: '^[0-9A-HJKMNP-TV-Z]{26}$' }],
  },
  {
    schema: z.string().datetime(),
    input: [true, { type: 'string', format: 'date-time' }],
  },
  {
    schema: z.string().date(),
    input: [true, { type: 'string', format: 'date' }],
  },
  {
    schema: z.string().time(),
    input: [true, { type: 'string', format: 'time' }],
  },
  {
    schema: z.string().duration(),
    input: [true, { type: 'string', format: 'duration' }],
  },
  {
    schema: z.string().ip(),
    input: [true, { type: 'string', anyOf: [{ format: 'ipv4' }, { format: 'ipv6' }] }],
  },
  {
    schema: z.string().ip({ version: 'v4' }),
    input: [true, { type: 'string', format: 'ipv4' }],
  },
  {
    schema: z.string().ip({ version: 'v6' }),
    input: [true, { type: 'string', format: 'ipv6' }],
  },
  {
    schema: z.string().jwt(),
    input: [true, { type: 'string', pattern: '^[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]*$' }],
  },
  {
    schema: z.string().base64url(),
    input: [true, { type: 'string', pattern: '^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$' }],
  },
  {
    schema: z.string().trim(),
    input: [true, { type: 'string' }],
  },
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
    schema: z.number().finite(),
    input: [true, { type: 'number' }],
  },
  {
    schema: z.bigint(),
    input: [true, { type: 'string', pattern: '^-?[0-9]+$' }],
    ignoreZodToJsonSchema: true,
  },
  {
    schema: z.boolean(),
    input: [true, { type: 'boolean' }],
  },
  {
    schema: z.date(),
    input: [true, { type: 'string', format: 'date-time' }],
  },
  // {
  //   schema: z.nan(),
  //   input: [true, { type: 'null' }],
  //   ignoreZodToJsonSchema: true,
  // },
  {
    schema: z.null(),
    input: [true, { type: 'null' }],
  },
  {
    schema: z.union([z.string(), z.number()]),
    input: [true, { anyOf: [{ type: 'string' }, { type: 'number' }] }],
    ignoreZodToJsonSchema: true,
  },
  {
    schema: z.union([z.string(), z.number().optional()]),
    input: [false, { anyOf: [{ type: 'string' }, { type: 'number' }] }],
    ignoreZodToJsonSchema: true,
  },
  // {
  //   schema: z.union([z.string(), z.undefined()]),
  //   input: [false, { anyOf: [{ type: 'string' }] }],
  //   ignoreZodToJsonSchema: true,
  // },
  // {
  //   schema: z.string().transform(x => x),
  //   input: [true, { type: 'string' }],
  //   output: [false, { }],
  // },
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
    ignoreZodToJsonSchema: true,
  },
  {
    schema: z.number().brand<'CAT'>(),
    input: [true, { type: 'number' }],
  },
  {
    schema: z.number().brand<'CAT'>(),
    input: [true, { type: 'number' }],
  },
  {
    schema: z.pipeline(z.number(), z.string()),
    input: [true, { type: 'number' }],
    output: [true, { type: 'string' }],
  },
  {
    schema: z.string().nullable(),
    input: [true, { anyOf: [{ type: 'null' }, { type: 'string' }] }],
    ignoreZodToJsonSchema: true,
  },
  // {
  //   schema: z.undefined(),
  //   input: [false, { not: {} }],
  // },
  // {
  //   schema: z.symbol(),
  //   input: [false, { not: {} }],
  // },
  // {
  //   schema: z.function(),
  //   input: [false, { not: {} }],
  // },
  // {
  //   schema: z.never(),
  //   input: [false, { not: {} }],
  // },
  {
    schema: file(),
    input: [true, { type: 'string', contentMediaType: '*/*' }],
    ignoreZodToJsonSchema: true,
  },
  {
    schema: file().type('image/png'),
    input: [true, { type: 'string', contentMediaType: 'image/png' }],
    ignoreZodToJsonSchema: true,
  },
  {
    schema: blob(),
    input: [true, { type: 'string', contentMediaType: '*/*' }],
    ignoreZodToJsonSchema: true,
  },
  {
    schema: regexp(),
    input: [true, { type: 'string', pattern: '^\\/(.*)\\/([a-z]*)$' }],
    ignoreZodToJsonSchema: true,
  },
  {
    schema: url(),
    input: [true, { type: 'string', format: 'uri' }],
    ignoreZodToJsonSchema: true,
  },
]

describe.each(cases)('zodToJsonSchemaConverter.convert %#', ({ schema, input, output = input, ignoreZodToJsonSchema }) => {
  describe.each([
    ['input'],
    ['output'],
  ] as const)('strategy: %s', (strategy) => {
    const converter = new ZodToJsonSchemaConverter()

    it('flat', () => {
      const [expectRequired, expectedJson] = strategy === 'input' ? input : output
      const [required, json] = converter.convert(schema, strategy)

      expect(required).toEqual(expectRequired)
      expect(json).toEqual(expectedJson)

      if (!ignoreZodToJsonSchema) {
        if (expectRequired) {
          expect(expectedJson).toEqual({
            ...zodToJsonSchema(schema, { target: 'jsonSchema2019-09', pipeStrategy: strategy }),
            $schema: undefined,
          })
        }
        else {
          expect({
            anyOf: [{ not: {} }, expectedJson],
          }).toEqual({
            ...zodToJsonSchema(schema, { target: 'jsonSchema2019-09', pipeStrategy: strategy }),
            $schema: undefined,
          })
        }
      }
    })

    it('object', () => {
      const testSchema = z.object({ value: schema })
      const [expectedRequired, expectedJson] = strategy === 'input' ? input : output
      const [required, json] = converter.convert(testSchema, strategy)

      expect(required).toEqual(true)
      expect(json).toEqual({
        type: 'object',
        properties: {
          value: expectedJson,
        },
        required: expectedRequired ? ['value'] : undefined,
      })

      if (!ignoreZodToJsonSchema) {
        expect(json).toEqual({
          ...zodToJsonSchema(testSchema, { target: 'jsonSchema2019-09', pipeStrategy: strategy }),
          $schema: undefined,
          additionalProperties: undefined,
        })
      }
    })

    it('object with catchall', () => {
      const testSchema = z.object({ value: schema }).catchall(schema)
      const [expectedRequired, expectedJson] = strategy === 'input' ? input : output
      const [required, json] = converter.convert(testSchema, strategy)

      expect(required).toEqual(true)
      expect(json).toEqual({
        type: 'object',
        properties: {
          value: expectedJson,
        },
        required: expectedRequired ? ['value'] : undefined,
        additionalProperties: expectedJson,
      })

      if (!ignoreZodToJsonSchema) {
        expect(json).toEqual({
          ...zodToJsonSchema(testSchema, { target: 'jsonSchema2019-09', pipeStrategy: strategy }),
          $schema: undefined,
          additionalProperties: expectedJson,
        })
      }
    })

    it('strict object', () => {
      const testSchema = z.object({ value: schema }).strict()
      const [expectedRequired, expectedJson] = strategy === 'input' ? input : output
      const [required, json] = converter.convert(testSchema, strategy)

      expect(required).toEqual(true)
      expect(json).toEqual({
        type: 'object',
        properties: {
          value: expectedJson,
        },
        required: expectedRequired ? ['value'] : undefined,
        additionalProperties: false,
      })

      if (!ignoreZodToJsonSchema) {
        expect(json).toEqual({
          ...zodToJsonSchema(testSchema, { target: 'jsonSchema2019-09', pipeStrategy: strategy }),
          $schema: undefined,
        })
      }
    })

    it('set', () => {
      const testSchema = z.set(schema)
      const [expectedRequired, expectedJson] = strategy === 'input' ? input : output
      const [required, json] = converter.convert(testSchema, strategy)

      expect(required).toEqual(true)
      expect(json).toEqual({
        type: 'array',
        uniqueItems: true,
        items: expectedRequired ? expectedJson : { anyOf: [{ type: 'null' }, expectedJson] },
      })

      if (!ignoreZodToJsonSchema) {
        expect({
          type: 'array',
          uniqueItems: true,
          items: expectedRequired ? expectedJson : { anyOf: [{ not: {} }, expectedJson] },
        }).toEqual({
          ...zodToJsonSchema(testSchema, { target: 'jsonSchema2019-09', pipeStrategy: strategy }),
          $schema: undefined,
        })
      }
    })

    it('map', () => {
      const testSchema = z.map(schema, schema.optional())
      const [expectedRequired, expectedJson] = strategy === 'input' ? input : output
      const [required, json] = converter.convert(testSchema, strategy)

      expect(required).toEqual(true)
      expect(json).toEqual({
        type: 'array',
        items: {
          type: 'array',
          maxItems: 2,
          minItems: 2,
          prefixItems: [
            expectedRequired ? expectedJson : { anyOf: [{ type: 'null' }, expectedJson] },
            { anyOf: [{ type: 'null' }, expectedJson] },
          ],
        },
      })

      if (!ignoreZodToJsonSchema) {
        expect({
          type: 'array',
          items: {
            maxItems: 2,
            minItems: 2,
            items: [
              expectedRequired ? expectedJson : { anyOf: [{ not: {} }, expectedJson] },
              { anyOf: [{ not: {} }, expectedRequired ? expectedJson : { anyOf: [{ not: {} }, expectedJson] }] },
            ],
            type: 'array',
          },
        }).toEqual({
          ...zodToJsonSchema(testSchema, { target: 'jsonSchema2019-09', pipeStrategy: strategy, $refStrategy: 'none' }),
          $schema: undefined,
          maxItems: undefined,
        })
      }
    })

    it('record', () => {
      const testSchema = z.record(schema)
      const [expectedRequired, expectedJson] = strategy === 'input' ? input : output
      const [required, json] = converter.convert(testSchema, strategy)

      expect(required).toEqual(true)
      expect(json).toEqual({
        type: 'object',
        additionalProperties: expectedJson,
      })

      if (!ignoreZodToJsonSchema) {
        expect({
          type: 'object',
          additionalProperties: expectedRequired ? expectedJson : { anyOf: [{ not: {} }, expectedJson] },
        }).toEqual({
          ...zodToJsonSchema(testSchema, { target: 'jsonSchema2019-09', pipeStrategy: strategy, $refStrategy: 'none' }),
          $schema: undefined,
          maxItems: undefined,
        })
      }
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
