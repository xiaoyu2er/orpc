import type { SchemaInput, SchemaOutput } from './types'
import { z } from 'zod'

test('SchemaInput', () => {
  const schema = z.string()

  expectTypeOf<SchemaInput<undefined>>().toEqualTypeOf<unknown>()
  expectTypeOf<SchemaInput<typeof schema>>().toEqualTypeOf<string>()
})

test('SchemaOutput', () => {
  const schema = z.string().transform(v => Number.parseFloat(v))

  expectTypeOf<SchemaOutput<undefined>>().toEqualTypeOf<unknown>()
  expectTypeOf<SchemaOutput<typeof schema>>().toEqualTypeOf<number>()
})
