import type { Schema, SchemaInput, SchemaOutput } from './types'
import { type } from 'arktype'
import * as v from 'valibot'
import { z } from 'zod'

const zod = z.object({
  value: z.string().transform(() => 123),
})

const valibot = v.object({
  value: v.pipe(v.string(), v.transform(() => 123)),
})

// How convert value into number?
const arktype = type({
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
