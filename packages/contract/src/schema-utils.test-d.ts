import type { SchemaInput, SchemaOutput } from './schema'
import { type } from './schema-utils'

describe('type', () => {
  it('without map', () => {
    const schema = type<string>()

    expectTypeOf<SchemaInput<typeof schema>>().toEqualTypeOf<string>()
    expectTypeOf<SchemaOutput<typeof schema>>().toEqualTypeOf<string>()
  })

  it('with map', () => {
    const schema2 = type<string, number>((val) => {
      expectTypeOf(val).toEqualTypeOf<string>()

      return Number(val)
    })

    expectTypeOf<SchemaInput<typeof schema2>>().toEqualTypeOf<string>()
    expectTypeOf<SchemaOutput<typeof schema2>>().toEqualTypeOf<number>()

    // @ts-expect-error - map is required when TInput !== TOutput
    type<string, number>()

    // @ts-expect-error - output not match number
    type<string, number>(() => '123')
  })
})
