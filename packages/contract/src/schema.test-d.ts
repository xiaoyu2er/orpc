import { type as arktypeType } from 'arktype'
import * as v from 'valibot'
import { z } from 'zod'
import { type Schema, type SchemaInput, type SchemaOutput, type } from './schema'

const zod = z.object({
  value: z.string().transform(() => 123),
})

const valibot = v.object({
  value: v.pipe(v.string(), v.transform(() => 123)),
})

// How convert value into number?
const arktype = arktypeType({
  value: 'string',
})

describe('Schema', () => {
  it('assignable', () => {
    const _undefined: Schema = undefined
    const _zod: Schema = zod
    const _valibot: Schema = valibot
    const _arktype: Schema = arktype
  })
})

describe('SchemaInput', () => {
  it('inferable', () => {
    expectTypeOf<SchemaInput<undefined>>().toEqualTypeOf<unknown>()
    expectTypeOf<SchemaInput<typeof zod>>().toEqualTypeOf<{ value: string }>()
    expectTypeOf<SchemaInput<typeof valibot>>().toEqualTypeOf<{ value: string }>()
    expectTypeOf<SchemaInput<typeof arktype>>().toEqualTypeOf<{ value: string }>()
  })
})

describe('SchemaOutput', () => {
  it('inferable', () => {
    expectTypeOf<SchemaOutput<undefined>>().toEqualTypeOf<unknown>()
    expectTypeOf<SchemaOutput<typeof zod>>().toEqualTypeOf<{ value: number }>()
    expectTypeOf<SchemaOutput<typeof valibot>>().toEqualTypeOf<{ value: number }>()
    expectTypeOf<SchemaOutput<typeof arktype>>().toEqualTypeOf<{ value: string }>()
  })
})

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
