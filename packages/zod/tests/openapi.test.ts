import { describe, expect, it } from 'vitest'
import { type ZodEffects, z } from 'zod'
import { getCustomJSONSchema, openapi } from '../src'

describe('openapi function', () => {
  const schema = z.object({
    id: z.string(),
  })

  const customSchema = {
    type: 'object',
    properties: {
      example: { type: 'string' },
    },
  } as const

  it('should not return the same zod schema', () => {
    const newSchema = openapi(schema, {})
    expectTypeOf(newSchema).toMatchTypeOf<
      ZodEffects<
        typeof schema,
        {
          id: string
        },
        {
          id: string
        }
      >
    >()

    expect(newSchema._def.schema).toBe(schema)
    expect(newSchema).not.toBe(schema) // prevent reference issue
  })

  it('should add a custom JSON schema to the Zod schema definition', () => {
    const newSchema = openapi(schema, customSchema)

    expect(getCustomJSONSchema(newSchema._def)).toBe(customSchema)
    expect(getCustomJSONSchema(newSchema._def, { mode: 'input' })).toBe(
      customSchema,
    )
    expect(getCustomJSONSchema(newSchema._def, { mode: 'output' })).toBe(
      customSchema,
    )
  })

  it('should work on input mode', () => {
    const newSchema = openapi(schema, customSchema, { mode: 'input' })

    expect(getCustomJSONSchema(newSchema._def)).toBe(undefined)
    expect(getCustomJSONSchema(newSchema._def, { mode: 'input' })).toBe(
      customSchema,
    )
    expect(getCustomJSONSchema(newSchema._def, { mode: 'output' })).toBe(
      undefined,
    )
  })

  it('should work on output mode', () => {
    const newSchema = openapi(schema, customSchema, { mode: 'output' })

    expect(getCustomJSONSchema(newSchema._def)).toBe(undefined)
    expect(getCustomJSONSchema(newSchema._def, { mode: 'input' })).toBe(
      undefined,
    )
    expect(getCustomJSONSchema(newSchema._def, { mode: 'output' })).toBe(
      customSchema,
    )
  })
})
