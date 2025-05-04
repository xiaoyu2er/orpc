import type { AnySchema } from '@orpc/contract'
import type { JSONSchema } from '@orpc/openapi'
import { ZodToJsonSchemaConverter } from '../src/v4'

export interface SchemaConverterTestCase {
  name: string
  schema: AnySchema
  input: [boolean, JSONSchema]
  output?: [boolean, JSONSchema]
}

export function testSchemaConverter(cases: SchemaConverterTestCase[]) {
  const converter = new ZodToJsonSchemaConverter({ maxLazyDepth: 1 })
  describe.each([['input'], ['output']] as const)('ZodToJsonSchemaConverter.converter: strategy = %s', (strategy) => {
    it.each(cases)(`$name (${strategy})`, async ({ schema, input, output = input }) => {
      const [expectedRequired, expectedJson] = strategy === 'input' ? input : output
      const [required, json] = await converter.convert(schema, { strategy })
      expect(json).toEqual(expectedJson)
      expect(required).toEqual(expectedRequired)
    })
  })
}
