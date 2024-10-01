import { Schema, z } from 'zod'
import type {
  PrefixHTTPPath,
  SchemaInput,
  SchemaOutput,
  StandardizeHTTPPath,
} from './types'

test('StandardizeHTTPPath', () => {
  expectTypeOf<StandardizeHTTPPath<undefined>>().toEqualTypeOf<undefined>()
  expectTypeOf<StandardizeHTTPPath<'/'>>().toEqualTypeOf<'/'>()
  expectTypeOf<StandardizeHTTPPath<'/abc'>>().toEqualTypeOf<'/abc'>()
  expectTypeOf<StandardizeHTTPPath<'/abc/'>>().toEqualTypeOf<'/abc'>()
  expectTypeOf<StandardizeHTTPPath<'/abc//'>>().toEqualTypeOf<'/abc'>()
  expectTypeOf<StandardizeHTTPPath<'//a//bc//'>>().toEqualTypeOf<'/a/bc'>()
})

test('PrefixHTTPPath', () => {
  expectTypeOf<PrefixHTTPPath<'/', '/'>>().toEqualTypeOf<'/'>()
  expectTypeOf<PrefixHTTPPath<'/', '/abc'>>().toEqualTypeOf<'/abc'>()
  expectTypeOf<PrefixHTTPPath<'/', '/abc/'>>().toEqualTypeOf<'/abc'>()
  expectTypeOf<PrefixHTTPPath<'/', '/abc//'>>().toEqualTypeOf<'/abc'>()
  expectTypeOf<PrefixHTTPPath<'/', '//abc//'>>().toEqualTypeOf<'/abc'>()
  expectTypeOf<PrefixHTTPPath<'/abc', '/abc'>>().toEqualTypeOf<'/abc/abc'>()
  expectTypeOf<PrefixHTTPPath<'/abc', '/abc/'>>().toEqualTypeOf<'/abc/abc'>()
})

test('SchemaInput', () => {
  const schema = z.string()

  expectTypeOf<SchemaInput<undefined>>().toEqualTypeOf<unknown>()
  expectTypeOf<SchemaInput<typeof schema>>().toEqualTypeOf<string>()
})

test('SchemaOutput', () => {
  const schema = z.string().transform((v) => Number.parseFloat(v))

  expectTypeOf<SchemaOutput<undefined>>().toEqualTypeOf<unknown>()
  expectTypeOf<SchemaOutput<typeof schema>>().toEqualTypeOf<number>()
})
