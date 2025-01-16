import type { SchemaInput, SchemaOutput } from './types'
import { type } from './schema-utils'

it('type', () => {
  const schema = type<string>()

  expectTypeOf<SchemaInput<typeof schema>>().toEqualTypeOf<string>()
  expectTypeOf<SchemaOutput<typeof schema>>().toEqualTypeOf<string>()

  const schema2 = type<string, number>()
  expectTypeOf<SchemaInput<typeof schema2>>().toEqualTypeOf<string>()
  expectTypeOf<SchemaOutput<typeof schema2>>().toEqualTypeOf<number>()
})
