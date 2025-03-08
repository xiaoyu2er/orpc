import type { JSONSchema, ObjectSchema } from './schema'
import { isObject } from '@orpc/shared'
import { filterSchemaBranches, isAnySchema, isFileSchema, isObjectSchema, separateObjectSchema, toJSONSchemaObject } from './schema-utils'

it('isFileSchema', () => {
  expect(isFileSchema({ type: 'string', contentMediaType: 'image/png' })).toBe(true)
  expect(isFileSchema({ type: 'string', contentMediaType: 'image/png', examples: ['image.png'] })).toBe(true)

  expect(isFileSchema({ type: 'object', contentMediaType: 'image/png' })).toBe(false)
  expect(isFileSchema(true)).toBe(false)
  expect(isFileSchema(false)).toBe(false)
})

it('isObjectSchema', () => {
  expect(isObjectSchema({ type: 'object' })).toBe(true)
  expect(isObjectSchema({ type: 'object', properties: { a: { type: 'string' } } })).toBe(true)

  expect(isObjectSchema({ type: 'string' })).toBe(false)
  expect(isObjectSchema(true)).toBe(false)
  expect(isObjectSchema(false)).toBe(false)
})

it('toJSONSchemaObject', () => {
  expect(toJSONSchemaObject(true)).toEqual({})
  expect(toJSONSchemaObject(false)).toEqual({ not: {} })
  expect(toJSONSchemaObject({ type: 'string' })).toEqual({ type: 'string' })
})

it('isAnySchema', () => {
  expect(isAnySchema(true)).toBe(true)
  expect(isAnySchema(false)).toBe(true)
  expect(isAnySchema({})).toBe(true)
  expect(isAnySchema({ type: 'string' })).toBe(false)
  expect(isAnySchema({ description: 'description' })).toBe(true)
})

describe('separateObjectSchema', () => {
  it('separate', () => {
    const schema: ObjectSchema = {
      type: 'object',
      description: 'description',
      properties: {
        a: { type: 'string' },
        b: { type: 'string' },
      },
      required: ['a', 'b'],
      examples: [
        { a: 'a', b: 'b' },
        { a: 'a', b: 'b' },
        { a: 'a' },
        'INVALID',
      ],
    }

    const [matched, rest] = separateObjectSchema(schema, ['a'])

    expect(matched).toEqual({
      type: 'object',
      description: 'description',
      properties: {
        a: { type: 'string' },
      },
      required: ['a'],
      examples: [
        { a: 'a' },
        { a: 'a' },
        { a: 'a' },
        'INVALID',
      ],
    })
    expect(rest).toEqual({
      type: 'object',
      description: 'description',
      properties: {
        b: { type: 'string' },
      },
      required: ['b'],
      examples: [
        { b: 'b' },
        { b: 'b' },
        {},
        'INVALID',
      ],
    })
  })

  it('not separate when contain not allow keyword', () => {
    const schema: ObjectSchema = {
      type: 'object',
      description: 'description',
      properties: {
        a: { type: 'string' },
        b: { type: 'string' },
      },
      required: ['a', 'b'],
      anyOf: [],
    }

    const [matched, rest] = separateObjectSchema(schema, ['a'])

    expect(matched).toEqual({ type: 'object' })
    expect(rest).toEqual(schema)
  })

  it('with no properties & required', () => {
    const schema: ObjectSchema = {
      type: 'object',
      description: 'description',
    }

    const [matched, rest] = separateObjectSchema(schema, ['a'])

    expect(matched).toEqual(schema)
    expect(rest).toEqual(schema)
  })
})

describe('filterSchemaBranches', () => {
  it('non-union case', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        a: { type: 'string' },
        b: { type: 'number' },
        c: {
          anyOf: [
            { type: 'string' },
            { type: 'number' },
          ],
        },
      },
      required: ['a'],
    }

    const [matches, rest] = filterSchemaBranches(schema, s => isObject(s) && s.type === 'string')
    expect(matches).toEqual([])
    expect(rest).toEqual(schema)

    const [matches1, rest1] = filterSchemaBranches(schema, s => true)
    expect(matches1).toEqual([schema])
    expect(rest1).toEqual(undefined)
  })

  describe.each(['anyOf', 'oneOf'] as const)('%s', (key) => {
    it('works', () => {
      const schema: JSONSchema = {
        description: 'description',
        [key]: [
          { type: 'string' },
          { type: 'number' },
          { type: 'object' },
        ],
      }

      const [matches, rest] = filterSchemaBranches(schema, s => isObject(s) && s.type === 'string')

      expect(matches).toEqual([{ type: 'string' }])
      expect(rest).toEqual({
        description: 'description',
        [key]: [
          { type: 'number' },
          { type: 'object' },
        ],
      })

      const [matches2, rest2] = filterSchemaBranches(schema, s => false)
      expect(matches2).toEqual([])
      expect(rest2).toEqual(schema)
    })

    it('can simplify rest', () => {
      const schema: JSONSchema = {
        description: 'description',
        $comment: 'comment',
        [key]: [
          { type: 'string' },
          { type: 'number', description: 'number' },
        ],
      }

      const [matches, rest] = filterSchemaBranches(schema, s => isObject(s) && s.type === 'string')

      expect(matches).toEqual([{ type: 'string' }])
      expect(rest).toEqual({ type: 'number', description: 'number', $comment: 'comment' })
    })

    it('not filter when contain not allow keyword', () => {
      const schema: JSONSchema = {
        description: 'description',
        $comment: 'comment',
        const: 'not-allowed',
        [key]: [
          { type: 'string' },
          { type: 'number', description: 'number' },
        ],
      }

      const [matches, rest] = filterSchemaBranches(schema, s => isObject(s) && s.type === 'string')

      expect(matches).toEqual([])
      expect(rest).toEqual(schema)
    })
  })
})
