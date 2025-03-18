import * as v from 'valibot'
import { z } from 'zod'
import { Experimental_ValibotToJsonSchemaConverter } from './converter'

it('experimental_ValibotToJsonSchemaConverter.convert', async () => {
  const converter = new Experimental_ValibotToJsonSchemaConverter()
  expect(converter.convert(v.string(), { strategy: 'input' })).toEqual([true, { type: 'string' }])
  expect(converter.convert(v.object({ a: v.string() }), { strategy: 'input' })).toEqual([true, { type: 'object', properties: { a: { type: 'string' } } }])
})

it('experimental_ValibotToJsonSchemaConverter.condition', async () => {
  const converter = new Experimental_ValibotToJsonSchemaConverter()
  expect(converter.condition(v.string())).toBe(true)
  expect(converter.condition(v.optional(v.string()))).toBe(true)
  expect(converter.condition(z.string())).toBe(false)
  expect(converter.condition(z.string().optional())).toBe(false)
})
