import { type } from 'arktype'
import { z } from 'zod'
import { experimental_ArkTypeToJsonSchemaConverter as ArkTypeToJsonSchemaConverter } from './converter'

it('arkTypeToJsonSchemaConverter.convert', async () => {
  const converter = new ArkTypeToJsonSchemaConverter()

  expect(converter.convert(type('string'), { strategy: 'input' })).toEqual(
    [true, {
      type: 'string',
    }],
  )
  expect(converter.convert(type({ a: 'string' }), { strategy: 'input' })).toEqual(
    [true, {
      type: 'object',
      properties: { a: { type: 'string' } },
      required: ['a'],
    }],
  )
})

it('arkTypeToJsonSchemaConverter.condition', async () => {
  const converter = new ArkTypeToJsonSchemaConverter()

  expect(converter.condition(type({ name: 'string' }))).toBe(true)
  expect(converter.condition(type('number'))).toBe(true)

  expect(converter.condition(z.string())).toBe(false)
  expect(converter.condition(z.string().optional())).toBe(false)
})
