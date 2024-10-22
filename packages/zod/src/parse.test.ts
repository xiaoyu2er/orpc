import { ZodError, z } from 'zod'
import { coerceParse, coerceParseAsync } from './parse'

describe('primitive', () => {
  it('only convert string & number', () => {
    const schema = z.string()

    expect(coerceParse(schema, '123')).toEqual('123')
    expect(coerceParse(schema, 123)).toEqual('123')

    expect(() => coerceParse(schema, true)).toThrowError(
      new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'boolean',
          path: [],
          message: 'Expected string, received boolean',
        },
      ]),
    )

    expect(() => coerceParse(schema, null)).toThrowError(
      new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'null',
          path: [],
          message: 'Expected string, received null',
        },
      ]),
    )

    expect(() => coerceParse(schema, undefined)).toThrowError(
      new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'undefined',
          path: [],
          message: 'Required',
        },
      ]),
    )
  })

  it('with string', () => {
    const schema = z.string()

    expect(coerceParse(schema, '123')).toEqual('123')
    expect(coerceParse(schema, 123)).toEqual('123')
  })

  it('with number', () => {
    const schema = z.number()

    expect(coerceParse(schema, 123)).toEqual(123)
    expect(coerceParse(schema, '123')).toEqual(123)

    expect(() => coerceParse(schema, '123d')).toThrow(
      new ZodError([
        {
          code: 'invalid_type',
          expected: 'number',
          received: 'string',
          path: [],
          message: 'Expected number, received string',
        },
      ]),
    )
  })

  it('with bigint', () => {
    const schema = z.bigint()

    expect(coerceParse(schema, 123)).toEqual(123n)
    expect(coerceParse(schema, '123')).toEqual(123n)

    expect(() => coerceParse(schema, '123d')).toThrow(
      new ZodError([
        {
          code: 'invalid_type',
          expected: 'bigint',
          received: 'string',
          path: [],
          message: 'Expected bigint, received string',
        },
      ]),
    )
  })

  it('with nan', () => {
    const schema = z.nan()

    expect(coerceParse(schema, Number.NaN)).toEqual(Number.NaN)
    expect(coerceParse(schema, '123d')).toEqual(Number.NaN)
    expect(coerceParse(schema, '123n')).toEqual(Number.NaN)

    expect(() => coerceParse(schema, '123')).toThrow(
      new ZodError([
        {
          code: 'invalid_type',
          expected: 'nan',
          received: 'number',
          path: [],
          message: 'Expected nan, received number',
        },
      ]),
    )
  })

  it('with boolean', () => {
    const schema = z.boolean()

    expect(coerceParse(schema, false)).toEqual(false)
    expect(coerceParse(schema, Number.NaN)).toEqual(false)
    expect(coerceParse(schema, 'false')).toEqual(false)
    expect(coerceParse(schema, 'false')).toEqual(false)
    expect(coerceParse(schema, 'off')).toEqual(false)
    expect(coerceParse(schema, '0')).toEqual(false)
    expect(coerceParse(schema, '')).toEqual(false)
    expect(coerceParse(schema, 0)).toEqual(false)

    expect(coerceParse(schema, true)).toEqual(true)
    expect(coerceParse(schema, 1)).toEqual(true)
    expect(coerceParse(schema, '1')).toEqual(true)
    expect(coerceParse(schema, 'true')).toEqual(true)
    expect(coerceParse(schema, 'True')).toEqual(true)
    expect(coerceParse(schema, 'on')).toEqual(true)
  })

  it('with data', () => {
    const schema = z.date()

    const date = new Date()
    const dateString = date.toISOString()
    const invalidDateString = '2023-:cccc'

    expect(coerceParse(schema, date)).toEqual(date)
    expect(coerceParse(schema, dateString)).toEqual(date)

    expect(coerceParse(schema, '2023-01-01')).toEqual(new Date('2023-01-01'))

    expect(() => coerceParse(schema, invalidDateString)).toThrow(
      new ZodError([
        {
          code: 'invalid_date',
          path: [],
          message: 'Invalid date',
        },
      ]),
    )
  })

  it('with null', () => {
    const schema = z.null()

    expect(coerceParse(schema, null)).toEqual(null)
    expect(coerceParse(schema, 'null')).toEqual(null)

    expect(() => coerceParse(schema, '')).toThrow(
      new ZodError([
        {
          code: 'invalid_type',
          expected: 'null',
          received: 'string',
          path: [],
          message: 'Expected null, received string',
        },
      ]),
    )

    expect(() => coerceParse(schema, 1)).toThrow(
      new ZodError([
        {
          code: 'invalid_type',
          expected: 'null',
          received: 'number',
          path: [],
          message: 'Expected null, received number',
        },
      ]),
    )
  })

  it('with undefined', () => {
    const schema = z.undefined()

    expect(coerceParse(schema, undefined)).toEqual(undefined)
    expect(coerceParse(schema, 'undefined')).toEqual(undefined)

    expect(() => coerceParse(schema, '')).toThrow(
      new ZodError([
        {
          code: 'invalid_type',
          expected: 'undefined',
          received: 'string',
          path: [],
          message: 'Expected undefined, received string',
        },
      ]),
    )

    expect(() => coerceParse(schema, 1)).toThrow(
      new ZodError([
        {
          code: 'invalid_type',
          expected: 'undefined',
          received: 'number',
          path: [],
          message: 'Expected undefined, received number',
        },
      ]),
    )
  })
})

describe('non-primitive', () => {
  it('with object', () => {
    const schema = z.object({ [0]: z.string() })

    expect(coerceParse(schema, ['1'])).toEqual({ [0]: '1' })

    expect(() => coerceParse(schema, [1])).toThrow(
      new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['0'],
          message: 'Expected string, received number',
        },
      ]),
    )

    expect(() => coerceParse(schema, '1234')).toThrow(
      new ZodError([
        {
          code: 'invalid_type',
          expected: 'object',
          received: 'string',
          path: [],
          message: 'Expected object, received string',
        },
      ]),
    )
  })

  it('with set', () => {
    const schema = z.set(z.string())

    expect(coerceParse(schema, new Set())).toEqual(new Set())
    expect(coerceParse(schema, new Set(['a']))).toEqual(new Set(['a']))

    expect(coerceParse(schema, ['a', 'b'])).toEqual(new Set(['a', 'b']))
    expect(coerceParse(schema, ['1', '1', 'b'])).toEqual(new Set(['1', 'b']))
    expect(
      coerceParse(z.set(z.tuple([z.number(), z.number()])), [
        [1, 2],
        [2, 3],
      ]),
    ).toEqual(
      new Set([
        [1, 2],
        [2, 3],
      ]),
    )

    expect(() => coerceParse(schema, {})).toThrow(
      new ZodError([
        {
          code: 'invalid_type',
          expected: 'set',
          received: 'object',
          path: [],
          message: 'Expected set, received object',
        },
      ]),
    )

    expect(() => coerceParse(schema, '1234')).toThrow(
      new ZodError([
        {
          code: 'invalid_type',
          expected: 'set',
          received: 'string',
          path: [],
          message: 'Expected set, received string',
        },
      ]),
    )

    expect(() => coerceParse(schema, 1234)).toThrow(
      new ZodError([
        {
          code: 'invalid_type',
          expected: 'set',
          received: 'number',
          path: [],
          message: 'Expected set, received number',
        },
      ]),
    )
  })

  it('with map', () => {
    const schema = z.map(z.string(), z.number())

    expect(coerceParse(schema, new Map())).toEqual(new Map())
    expect(coerceParse(schema, new Map([['a', 1]]))).toEqual(
      new Map([['a', 1]]),
    )
    expect(
      coerceParse(schema, [
        ['a', 1],
        ['b', 2],
      ]),
    ).toEqual(
      new Map([
        ['a', 1],
        ['b', 2],
      ]),
    )

    expect(() => coerceParse(schema, [[]])).toThrow(
      new ZodError([
        {
          code: 'invalid_type',
          expected: 'map',
          received: 'array',
          path: [],
          message: 'Expected map, received array',
        },
      ]),
    )

    expect(() => coerceParse(schema, {})).toThrow(
      new ZodError([
        {
          code: 'invalid_type',
          expected: 'map',
          received: 'object',
          path: [],
          message: 'Expected map, received object',
        },
      ]),
    )

    expect(() => coerceParse(schema, '1234')).toThrow(
      new ZodError([
        {
          code: 'invalid_type',
          expected: 'map',
          received: 'string',
          path: [],
          message: 'Expected map, received string',
        },
      ]),
    )

    expect(() => coerceParse(schema, 1234)).toThrow(
      new ZodError([
        {
          code: 'invalid_type',
          expected: 'map',
          received: 'number',
          path: [],
          message: 'Expected map, received number',
        },
      ]),
    )
  })
})

describe('combination', () => {
  it('with array', () => {
    const schema = z.array(z.number())

    expect(coerceParse(schema, [1, 2, 3])).toEqual([1, 2, 3])
    expect(coerceParse(schema, [1, 2, '3'])).toEqual([1, 2, 3])

    expect(() => coerceParse(schema, [1, 2, 'd'])).toThrow(
      new ZodError([
        {
          code: 'invalid_type',
          expected: 'number',
          received: 'string',
          path: [2],
          message: 'Expected number, received string',
        },
      ]),
    )
  })

  it('with tuple', () => {
    const schema = z.tuple([z.number(), z.string(), z.date()])

    expect(coerceParse(schema, [1, '2', new Date('2023-01-01')])).toEqual([
      1,
      '2',
      new Date('2023-01-01'),
    ])

    expect(coerceParse(schema, ['1.1', 2, '2023-01-01'])).toEqual([
      1.1,
      '2',
      new Date('2023-01-01'),
    ])
  })

  it('with tuple 2', () => {
    const schema = z.tuple([z.number(), z.string(), z.date()]).rest(z.null())

    expect(coerceParse(schema, [1, '2', new Date(123), null, null])).toEqual([
      1,
      '2',
      new Date(123),
      null,
      null,
    ])

    expect(coerceParse(schema, ['1.1', 2, '2023-01-01', null, 'null'])).toEqual(
      [1.1, '2', new Date('2023-01-01'), null, null],
    )
  })

  it('with object', () => {
    const schema = z.object({
      a: z.number(),
      b: z.string(),
      c: z.date(),
    })

    expect(
      coerceParse(schema, { a: 1, b: '2', c: new Date('2023-01-01') }),
    ).toEqual({
      a: 1,
      b: '2',
      c: new Date('2023-01-01'),
    })

    expect(coerceParse(schema, { a: '1.1', b: 2, c: '2023-01-01' })).toEqual({
      a: 1.1,
      b: '2',
      c: new Date('2023-01-01'),
    })
  })

  it('with union', () => {
    const schema = z.union([z.number(), z.date()])

    expect(coerceParse(schema, 1)).toEqual(1)
    expect(coerceParse(schema, '1')).toEqual(1)
    expect(coerceParse(schema, new Date(123))).toEqual(new Date(123))
    expect(coerceParse(schema, '2023-01-01')).toEqual(new Date('2023-01-01'))
    expect(coerceParse(schema, '123')).toEqual(123)
  })

  it('with union 2', () => {
    const s1 = z.object({ a: z.number() }).or(z.object({ a: z.date() }))

    expect(
      coerceParse(s1, {
        a: '123',
      }),
    ).toEqual({
      a: 123,
    })

    expect(
      coerceParse(s1, {
        a: '2023-06-06',
      }),
    ).toEqual({
      a: new Date('2023-06-06'),
    })

    const s2 = z.object({ a: z.number() }).or(z.object({ a: z.null() }))

    expect(coerceParse(s2, { a: '1233' })).toEqual({ a: 1233 })
    expect(coerceParse(s2, { a: 'null' })).toEqual({ a: null })

    expect(() => coerceParse(s2, { a: 'pow' })).toThrow(
      new ZodError([
        {
          code: 'invalid_union',
          unionErrors: [
            {
              issues: [
                {
                  code: 'invalid_type',
                  expected: 'number',
                  received: 'string',
                  path: ['a'],
                  message: 'Expected number, received string',
                },
              ],
              name: 'ZodError',
            },
            {
              issues: [
                {
                  code: 'invalid_type',
                  expected: 'null',
                  received: 'string',
                  path: ['a'],
                  message: 'Expected null, received string',
                },
              ],
              name: 'ZodError',
            },
          ],
          path: [],
          message: 'Invalid input',
        },
      ] as any),
    )
  })

  it('with intersection', () => {
    const schema = z.intersection(
      z.object({
        a: z.number(),
        b: z.string(),
      }),
      z.object({
        c: z.date(),
      }),
    )

    expect(
      coerceParse(schema, {
        a: 1,
        b: '2',
        c: new Date(123),
      }),
    ).toEqual({
      a: 1,
      b: '2',
      c: new Date(123),
    })

    expect(
      coerceParse(schema, {
        a: 1,
        b: '2',
        c: '2023-01-01',
      }),
    ).toEqual({
      a: 1,
      b: '2',
      c: new Date('2023-01-01'),
    })
  })

  it('with record', () => {
    const schema = z.record(z.date())
    expect(coerceParse(schema, {})).toEqual({})
    expect(coerceParse(schema, { a: new Date('2023-01-01') })).toEqual({
      a: new Date('2023-01-01'),
    })
    expect(coerceParse(schema, { a: '2023-01-01' })).toEqual({
      a: new Date('2023-01-01'),
    })

    expect(() => coerceParse(schema, { a: 123, b: '123' })).toThrow(
      new ZodError([
        {
          code: 'invalid_type',
          expected: 'date',
          received: 'number',
          path: ['a'],
          message: 'Expected date, received number',
        },
        {
          code: 'invalid_type',
          expected: 'date',
          received: 'string',
          path: ['b'],
          message: 'Expected date, received string',
        },
      ]),
    )
  })
})

describe('advanced', () => {
  it('case 1', () => {
    const schema = z.object({
      a: z.union([z.number(), z.date()]),
      b: z.union([z.number(), z.date()]),
      c: z
        .object({
          a: z.set(z.number()),
          b: z.map(z.string(), z.number()),
        })
        .or(
          z.object({
            b: z.number(),
          }),
        ),
    })
    const validData = {
      a: new Date('2023-01-01'),
      b: 123,
      c: {
        a: new Set([1, 2, 3]),
        b: new Map([
          ['a', 1],
          ['b', 2],
        ]),
      },
    }

    const data = {
      a: '2023-01-01',
      b: '123',
      c: {
        a: [1, 2, 3],
        b: [
          ['a', 1],
          ['b', 2],
        ],
      },
    }

    expect(coerceParse(schema, data)).toEqual(validData)
  })
})

describe('async', () => {
  it('case 1', async () => {
    const schema = z.object({
      a: z.union([z.number(), z.date()]),
      b: z.union([z.number(), z.date()]),
      c: z
        .object({
          a: z.set(z.number()),
          b: z.map(z.string(), z.number()),
        })
        .or(
          z.object({
            b: z.number(),
          }),
        ),
    })
    const validData = {
      a: new Date('2023-01-01'),
      b: 123,
      c: {
        a: new Set([1, 2, 3]),
        b: new Map([
          ['a', 1],
          ['b', 2],
        ]),
      },
    }

    const data = {
      a: '2023-01-01',
      b: '123',
      c: {
        a: [1, 2, 3],
        b: [
          ['a', 1],
          ['b', 2],
        ],
      },
    }

    expect(await coerceParseAsync(schema, data)).toEqual(validData)
  })

  it('case 2', async () => {
    const schema = z.object({
      a: z.union([z.number(), z.date()]),
      b: z.union([z.number(), z.date()]),
      c: z
        .object({
          a: z.set(z.number()),
          b: z.map(z.string(), z.number()),
        })
        .or(
          z.object({
            b: z.number(),
          }),
        ),
    })
    const validData = {
      a: new Date('2023-01-01'),
      b: 123,
      c: {
        a: new Set([1, 2, 3]),
        b: new Map([
          ['a', 1],
          ['b', 2],
        ]),
      },
    }

    const data = {
      a: '2023-01-01',
      b: '123',
      c: {
        a: [1, 2, 3],
        b: [
          ['a', 1],
          ['b', 2],
        ],
      },
    }

    expect(await coerceParseAsync(schema, data)).toEqual(validData)
  })

  it('case 3', async () => {
    const schema = z.object({
      a: z.union([z.number(), z.date()]),
      b: z.union([z.number(), z.date()]),
      c: z
        .object({
          a: z.set(z.number()),
          b: z.map(z.string(), z.number()),
        })
        .or(
          z.object({
            b: z.number(),
          }),
        ),
    })
    const validData = {
      a: new Date('2023-01-01'),
      b: 123,
      c: {
        a: new Set([1, 2, 3]),
        b: new Map([
          ['a', 1],
          ['b', 2],
        ]),
      },
    }

    const data = {
      a: '2023-01-01',
      b: '123',
      c: {
        a: [1, 2, 3],
        b: [
          ['a', 1],
          ['b', 2],
        ],
      },
    }

    expect(await coerceParseAsync(schema, data)).toEqual(validData)
  })
})
