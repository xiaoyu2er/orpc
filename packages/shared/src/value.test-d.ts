import { value, type Value } from './value'

describe('value', () => {
  it('types', () => {
    let v: Value<number> = 42

    v = async () => 42
    v = () => 42

    // @ts-expect-error - not a number
    v = null

    // @ts-expect-error - not a number
    v = 'string'
  })

  it('function', () => {
    expectTypeOf(value(Number(42))).toEqualTypeOf<Promise<number>>()
    expectTypeOf(value(() => Number(42))).toEqualTypeOf<Promise<number>>()
    expectTypeOf(value(async () => Number(42))).toEqualTypeOf<Promise<number>>()
  })
})
