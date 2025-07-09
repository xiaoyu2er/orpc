import type { JsonSchema } from '../src'
import { experimental_JsonSchemaCoercer as JsonSchemaCoercer } from '../src'

export interface JsonSchemaCoercerTestCase {
  name: string
  schema: JsonSchema & Record<string, unknown>
  input: unknown
  expected?: unknown
}

export function testJsonSchemaCoercer(cases: JsonSchemaCoercerTestCase[]) {
  const coercer = new JsonSchemaCoercer()

  it.each(cases)('$name', ({ schema, input, expected = input }) => {
    expect(coercer.coerce(schema, input)).toEqual(expected)
  })
}
