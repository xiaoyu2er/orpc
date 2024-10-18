import { ZodError, z } from 'zod'
import { smartParse } from './parse'

describe('primitive', () => {
  it('only convert string & number', () => {
    const schema = z.string()

    expect(smartParse(schema, '123')).toEqual('123')
    expect(smartParse(schema, 123)).toEqual('123')

    expect(() => smartParse(schema, true)).toThrowError(
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

    expect(() => smartParse(schema, null)).toThrowError(
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

    expect(() => smartParse(schema, undefined)).toThrowError(
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

    expect(smartParse(schema, '123')).toEqual('123')
    expect(smartParse(schema, 123)).toEqual('123')
  })

  it('with number', () => {
    const schema = z.number()

    expect(smartParse(schema, 123)).toEqual(123)
    expect(smartParse(schema, '123')).toEqual(123)

    expect(() => smartParse(schema, '123d')).toThrow(
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

    expect(smartParse(schema, 123)).toEqual(123n)
    expect(smartParse(schema, '123')).toEqual(123n)

    expect(() => smartParse(schema, '123d')).toThrow(
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

    expect(smartParse(schema, Number.NaN)).toEqual(Number.NaN)
    expect(smartParse(schema, '123d')).toEqual(Number.NaN)
    expect(smartParse(schema, '123n')).toEqual(Number.NaN)

    expect(() => smartParse(schema, '123')).toThrow(
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

    expect(smartParse(schema, false)).toEqual(false)
    expect(smartParse(schema, Number.NaN)).toEqual(false)
    expect(smartParse(schema, 'false')).toEqual(false)
    expect(smartParse(schema, 'false')).toEqual(false)
    expect(smartParse(schema, 'off')).toEqual(false)
    expect(smartParse(schema, '0')).toEqual(false)
    expect(smartParse(schema, '')).toEqual(false)
    expect(smartParse(schema, 0)).toEqual(false)

    expect(smartParse(schema, true)).toEqual(true)
    expect(smartParse(schema, 1)).toEqual(true)
    expect(smartParse(schema, '1')).toEqual(true)
    expect(smartParse(schema, 'true')).toEqual(true)
    expect(smartParse(schema, 'True')).toEqual(true)
    expect(smartParse(schema, 'on')).toEqual(true)
  })

  it('with data', () => {
    const schema = z.date()

    const date = new Date()
    const dateNumber = date.getTime()
    const dateString = date.toISOString()
    const invalidDateString = 'invalid'

    expect(smartParse(schema, date)).toEqual(date)
    expect(smartParse(schema, dateNumber)).toEqual(date)
    expect(smartParse(schema, dateString)).toEqual(date)

    expect(smartParse(schema, '2023-01-01')).toEqual(new Date('2023-01-01'))

    expect(() => smartParse(schema, invalidDateString)).toThrow(
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

    expect(smartParse(schema, null)).toEqual(null)
    expect(smartParse(schema, 'null')).toEqual(null)

    expect(() => smartParse(schema, '')).toThrow(
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

    expect(() => smartParse(schema, 1)).toThrow(
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

    expect(smartParse(schema, undefined)).toEqual(undefined)
    expect(smartParse(schema, 'undefined')).toEqual(undefined)

    expect(() => smartParse(schema, '')).toThrow(
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

    expect(() => smartParse(schema, 1)).toThrow(
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

describe('Map and Set', () => {
  it('with set', () => {
    const schema = z.set(z.string())

    expect(smartParse(schema, new Set())).toEqual(new Set())
    expect(smartParse(schema, new Set(['a']))).toEqual(new Set(['a']))

    expect(smartParse(schema, ['a', 'b'])).toEqual(new Set(['a', 'b']))
    expect(smartParse(schema, ['1', '1', 'b'])).toEqual(new Set(['1', 'b']))
    expect(
      smartParse(z.set(z.tuple([z.number(), z.number()])), [
        [1, 2],
        [2, 3],
      ]),
    ).toEqual(
      new Set([
        [1, 2],
        [2, 3],
      ]),
    )

    expect(() => smartParse(schema, {})).toThrow(
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

    expect(() => smartParse(schema, '1234')).toThrow(
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

    expect(() => smartParse(schema, 1234)).toThrow(
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

    expect(smartParse(schema, new Map())).toEqual(new Map())
    expect(smartParse(schema, new Map([['a', 1]]))).toEqual(new Map([['a', 1]]))
    expect(
      smartParse(schema, [
        ['a', 1],
        ['b', 2],
      ]),
    ).toEqual(
      new Map([
        ['a', 1],
        ['b', 2],
      ]),
    )

    expect(() => smartParse(schema, [[]])).toThrow(
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

    expect(() => smartParse(schema, {})).toThrow(
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

    expect(() => smartParse(schema, '1234')).toThrow(
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

    expect(() => smartParse(schema, 1234)).toThrow(
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

    expect(smartParse(schema, [1, 2, 3])).toEqual([1, 2, 3])
    expect(smartParse(schema, [1, 2, '3'])).toEqual([1, 2, 3])

    expect(() => smartParse(schema, [1, 2, 'd'])).toThrow(
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

    expect(smartParse(schema, [1, '2', new Date(123)])).toEqual([
      1,
      '2',
      new Date(123),
    ])

    expect(smartParse(schema, ['1.1', 2, 123])).toEqual([
      1.1,
      '2',
      new Date(123),
    ])
  })

  it('with tuple 2', () => {
    const schema = z.tuple([z.number(), z.string(), z.date()]).rest(z.null())

    expect(smartParse(schema, [1, '2', new Date(123), null, null])).toEqual([
      1,
      '2',
      new Date(123),
      null,
      null,
    ])

    expect(smartParse(schema, ['1.1', 2, 123, null, 'null'])).toEqual([
      1.1,
      '2',
      new Date(123),
      null,
      null,
    ])
  })

  it('with object', () => {
    const schema = z.object({
      a: z.number(),
      b: z.string(),
      c: z.date(),
    })

    expect(smartParse(schema, { a: 1, b: '2', c: new Date(123) })).toEqual({
      a: 1,
      b: '2',
      c: new Date(123),
    })

    expect(smartParse(schema, { a: '1.1', b: 2, c: 123 })).toEqual({
      a: 1.1,
      b: '2',
      c: new Date(123),
    })
  })

  it('with union', () => {
    const schema = z.union([z.number(), z.date()])

    expect(smartParse(schema, 1)).toEqual(1)
    expect(smartParse(schema, '1')).toEqual(1)
    expect(smartParse(schema, new Date(123))).toEqual(new Date(123))
    expect(smartParse(schema, '2023-01-01')).toEqual(new Date('2023-01-01'))
    expect(smartParse(schema, '123')).toEqual(123)
  })

  it('with union 2', () => {
    const s1 = z.object({ a: z.number() }).or(z.object({ a: z.date() }))

    expect(
      smartParse(s1, {
        a: '123',
      }),
    ).toEqual({
      a: 123,
    })

    expect(
      smartParse(s1, {
        a: '2023-06-06',
      }),
    ).toEqual({
      a: new Date('2023-06-06'),
    })

    const s2 = z.object({ a: z.number() }).or(z.object({ a: z.null() }))

    expect(smartParse(s2, { a: '1233' })).toEqual({ a: 1233 })
    expect(smartParse(s2, { a: 'null' })).toEqual({ a: null })

    expect(() => smartParse(s2, { a: 'pow' })).toThrow(
      new ZodError([
        {
          code: 'invalid_union',
          unionErrors: [
            {
              issues: [
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
              ],
              name: 'ZodError',
            },
            {
              issues: [
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
              ],
              name: 'ZodError',
            },
          ],
          path: [],
          message: 'Invalid union',
        } as any,
      ]),
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
      smartParse(schema, {
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
      smartParse(schema, {
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
    expect(smartParse(schema, {})).toEqual({})
    expect(smartParse(schema, { a: new Date(123) })).toEqual({
      a: new Date(123),
    })

    expect(smartParse(schema, { a: 123, b: '123' })).toEqual({
      a: new Date(123),
      b: new Date('123'),
    })
  })
})
