import { ZodError, z } from 'zod'
import { coerceParse } from './zod-coerce-parse'

describe('primitive schemas', () => {
  it('should parse and coerce number schemas', () => {
    const schema = z.number()
    expect(coerceParse(schema, '123', { bracketNotation: true })).toEqual(123)

    // Should throw for invalid number strings
    expect(() => coerceParse(schema, 'abc')).toThrowError(ZodError)
  })

  it('should parse and coerce boolean schemas', () => {
    const schema = z.boolean()
    expect(coerceParse(schema, 'true', { bracketNotation: true })).toEqual(true)
    expect(coerceParse(schema, 'false', { bracketNotation: true })).toEqual(
      false,
    )
    expect(coerceParse(schema, '1', { bracketNotation: true })).toEqual(true)
    expect(coerceParse(schema, '0', { bracketNotation: true })).toEqual(false)
  })

  it('should parse and coerce date schemas', () => {
    const schema = z.date()
    const testDate = new Date('2023-01-01')
    expect(coerceParse(schema, '2023-01-01')).toEqual(testDate)

    // Should throw for invalid dates
    expect(() => coerceParse(schema, 'invalid-date')).toThrowError(ZodError)
  })
})

describe('complex schemas', () => {
  it('should parse and coerce array schemas', () => {
    const schema = z.array(z.number())
    expect(
      coerceParse(schema, ['1', '2', '3'], { bracketNotation: true }),
    ).toEqual([1, 2, 3])

    // Should throw for non-coercible array elements
    expect(() => coerceParse(schema, ['1', 'abc'])).toThrowError(ZodError)
  })

  it('should parse and coerce object schemas', () => {
    const schema = z.object({
      num: z.number(),
      str: z.string(),
      date: z.date(),
    })

    expect(
      coerceParse(
        schema,
        {
          num: '123',
          str: '456',
          date: '2023-01-01',
        },
        { bracketNotation: true },
      ),
    ).toEqual({
      num: 123,
      str: '456',
      date: new Date('2023-01-01'),
    })
  })

  it('should parse and coerce union schemas', () => {
    const schema = z.union([z.number(), z.date()])
    expect(coerceParse(schema, '2023-01-01')).toEqual(new Date('2023-01-01'))
  })

  it('should handle nested object unions', () => {
    const schema = z.object({
      data: z.union([
        z.object({ type: z.literal('number'), value: z.number() }),
        z.object({ type: z.literal('date'), value: z.date() }),
      ]),
    })

    expect(
      coerceParse(schema, {
        data: { type: 'date', value: '2023-01-01' },
      }),
    ).toEqual({
      data: { type: 'date', value: new Date('2023-01-01') },
    })
  })
})

describe('edge cases', () => {
  it('should handle empty arrays and objects', () => {
    const arraySchema = z.object({ arr: z.array(z.string()) })
    const objectSchema = z.object({ obj: z.object({}) })

    expect(coerceParse(arraySchema, {}, { bracketNotation: true })).toEqual({
      arr: [],
    })
    expect(coerceParse(objectSchema, {}, { bracketNotation: true })).toEqual({
      obj: {},
    })
  })

  it('should handle array-object conversions', () => {
    const arraySchema = z.object({ arr: z.array(z.string()) })
    expect(
      coerceParse(
        arraySchema,
        {
          arr: { 0: 'first', 1: 'second' },
        },
        { bracketNotation: true },
      ),
    ).toEqual({
      arr: ['first', 'second'],
    })

    const objectSchema = z.object({ obj: z.object({ '': z.string() }) })
    expect(
      coerceParse(
        objectSchema,
        {
          obj: ['a', 'b'],
        },
        { bracketNotation: true },
      ),
    ).toEqual({
      obj: { '': 'b' },
    })
  })
})
