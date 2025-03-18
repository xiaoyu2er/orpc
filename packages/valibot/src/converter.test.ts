import * as v from 'valibot'
import { z } from 'zod'
import { experimental_ValibotToJsonSchemaConverter as ValibotToJsonSchemaConverter } from './converter'

it('valibotToJsonSchemaConverter.convert', async () => {
  const converter = new ValibotToJsonSchemaConverter()
  expect(converter.convert(v.string(), { strategy: 'input' })).toEqual(
    [true, {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'string',
    }],
  )
  expect(converter.convert(v.object({ a: v.string() }), { strategy: 'input' })).toEqual(
    [true, {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: { a: { type: 'string' } },
      required: ['a'],
    }],
  )
})

it('valibotToJsonSchemaConverter.condition', async () => {
  const converter = new ValibotToJsonSchemaConverter()
  expect(converter.condition(v.string())).toBe(true)
  expect(converter.condition(v.optional(v.string()))).toBe(true)
  expect(converter.condition(z.string())).toBe(false)
  expect(converter.condition(z.string().optional())).toBe(false)
})
