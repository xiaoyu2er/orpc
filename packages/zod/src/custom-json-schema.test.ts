import { z } from 'zod'
import { customJsonSchema, getCustomJsonSchema } from './custom-json-schema'

describe('custom json schema', () => {
  it('both strategy', () => {
    const schema = customJsonSchema(z.string(), { $comment: '__COMMENT__' }, 'both')

    expect(() => schema.parse(123)).toThrow('Expected string, received number')

    expect(getCustomJsonSchema(schema._def, 'both')).toEqual({ $comment: '__COMMENT__' })
    expect(getCustomJsonSchema(schema._def, 'input')).toEqual({ $comment: '__COMMENT__' })
    expect(getCustomJsonSchema(schema._def, 'output')).toEqual({ $comment: '__COMMENT__' })
  })

  it('input strategy', () => {
    const schema = customJsonSchema(z.string(), { $comment: '__COMMENT__' }, 'input')

    expect(() => schema.parse(123)).toThrow('Expected string, received number')

    expect(getCustomJsonSchema(schema._def, 'both')).toEqual(undefined)
    expect(getCustomJsonSchema(schema._def, 'input')).toEqual({ $comment: '__COMMENT__' })
    expect(getCustomJsonSchema(schema._def, 'output')).toEqual(undefined)
  })

  it('output strategy', () => {
    const schema = customJsonSchema(z.string(), { $comment: '__COMMENT__' }, 'output')

    expect(() => schema.parse(123)).toThrow('Expected string, received number')

    expect(getCustomJsonSchema(schema._def, 'both')).toEqual(undefined)
    expect(getCustomJsonSchema(schema._def, 'input')).toEqual(undefined)
    expect(getCustomJsonSchema(schema._def, 'output')).toEqual({ $comment: '__COMMENT__' })
  })
})
