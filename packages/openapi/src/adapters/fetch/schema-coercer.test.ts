import type { Schema } from '@orpc/contract'
import { z } from 'zod'
import { CompositeSchemaCoercer, type SchemaCoercer } from './schema-coercer'

// Mock implementation of SchemaCoercer for testing
class MockSchemaCoercer implements SchemaCoercer {
  constructor(private readonly transform: (value: unknown) => unknown) { }

  coerce(schema: Schema, value: unknown): unknown {
    return this.transform(value)
  }
}

describe('compositeSchemaCoercer', () => {
  describe('coerce', () => {
    it('should apply coercers in sequence with number schema', () => {
      const addOneCoercer = new MockSchemaCoercer(value => (typeof value === 'number' ? value + 1 : value))
      const multiplyByTwoCoercer = new MockSchemaCoercer(value => (typeof value === 'number' ? value * 2 : value))

      const composite = new CompositeSchemaCoercer([addOneCoercer, multiplyByTwoCoercer])
      const schema = z.number()

      const result = composite.coerce(schema, 5)

      // First coercer adds 1 (5 -> 6), then second coercer multiplies by 2 (6 -> 12)
      expect(result).toBe(12)
    })

    it('should handle string to number coercion', () => {
      const stringToNumberCoercer = new MockSchemaCoercer(value =>
        typeof value === 'string' ? Number.parseInt(value, 10) : value,
      )

      const composite = new CompositeSchemaCoercer([stringToNumberCoercer])
      const schema = z.number()

      const result = composite.coerce(schema, '123')

      expect(result).toBe(123)
      expect(typeof result).toBe('number')
    })

    it('should handle empty coercer array', () => {
      const composite = new CompositeSchemaCoercer([])
      const schema = z.string()
      const value = 'test'

      const result = composite.coerce(schema, value)

      expect(result).toBe(value)
    })

    it('should pass schema to each coercer', () => {
      const schema = z.string().regex(/^test/)
      const mockCoercer = {
        coerce: vi.fn().mockImplementation((_, value) => value),
      }

      const composite = new CompositeSchemaCoercer([mockCoercer])
      composite.coerce(schema, 'test')

      expect(mockCoercer.coerce).toHaveBeenCalledWith(schema, 'test')
    })

    it('should handle complex object schemas', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
        isActive: z.boolean(),
      })

      const objectCoercer = new MockSchemaCoercer((value: any) => {
        if (typeof value !== 'object' || value === null)
          return value
        return {
          ...value,
          age: typeof value.age === 'string' ? Number.parseInt(value.age, 10) : value.age,
        }
      })

      const composite = new CompositeSchemaCoercer([objectCoercer])

      const result = composite.coerce(schema, {
        name: 'John',
        age: '30',
        isActive: true,
      })

      expect(result).toEqual({
        name: 'John',
        age: 30,
        isActive: true,
      })
    })

    it('should handle array schemas', () => {
      const schema = z.array(z.number())
      const arrayCoercer = new MockSchemaCoercer((value) => {
        if (!Array.isArray(value))
          return value
        return value.map(item => typeof item === 'string' ? Number.parseInt(item, 10) : item)
      })

      const composite = new CompositeSchemaCoercer([arrayCoercer])

      const result = composite.coerce(schema, ['1', '2', '3'])

      expect(result).toEqual([1, 2, 3])
    })

    it('should maintain coercer order with complex transformations', () => {
      const transforms: unknown[] = []
      const schema = z.any()

      const firstCoercer = new MockSchemaCoercer((value) => {
        transforms.push(1)
        return value
      })

      const secondCoercer = new MockSchemaCoercer((value) => {
        transforms.push(2)
        return value
      })

      const thirdCoercer = new MockSchemaCoercer((value) => {
        transforms.push(3)
        return value
      })

      const composite = new CompositeSchemaCoercer([firstCoercer, secondCoercer, thirdCoercer])

      composite.coerce(schema, 'test')

      expect(transforms).toEqual([1, 2, 3])
    })

    it('should handle optional fields in object schemas', () => {
      const schema = z.object({
        required: z.string(),
        optional: z.number().optional(),
      })

      const objectCoercer = new MockSchemaCoercer((value: any) => {
        if (typeof value !== 'object' || value === null)
          return value
        return {
          ...value,
          optional: value.optional !== undefined
            ? typeof value.optional === 'string'
              ? Number.parseInt(value.optional, 10)
              : value.optional
            : undefined,
        }
      })

      const composite = new CompositeSchemaCoercer([objectCoercer])

      const result = composite.coerce(schema, {
        required: 'test',
        optional: '42',
      })

      expect(result).toEqual({
        required: 'test',
        optional: 42,
      })
    })
  })
})
