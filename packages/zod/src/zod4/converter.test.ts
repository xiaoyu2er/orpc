import * as z from 'zod/v4'
import * as zm from 'zod/v4-mini'
import {
  experimental_ZodToJsonSchemaConverter as ZodToJsonSchemaConverter,
} from './converter'

describe('zodToJsonSchemaConverter', () => {
  const converter = new ZodToJsonSchemaConverter()

  it('.condition', async () => {
    expect(converter.condition(z.string())).toBe(true)
    expect(converter.condition(z.string().optional())).toBe(true)

    const v = await import('valibot')

    expect(converter.condition(v.string())).toBe(false)
  })

  it('zod mini', async () => {
    const schema = zm.object({
      value: zm.string().check(zm.minLength(5), zm.maxLength(10), zm.regex(/^[a-z\\]+$/)),
    })

    expect(converter.condition(schema)).toBe(true)

    const [required, json] = await converter.convert(schema, { strategy: 'input' })

    expect(required).toEqual(true)
    expect(json).toEqual({
      type: 'object',
      properties: {
        value: {
          type: 'string',
          maxLength: 10,
          minLength: 5,
          pattern: '^[a-z\\\\]+$',
        },
      },
      required: ['value'],
    })
  })
})
