import { bench } from 'vitest'
import { z } from 'zod'
import { zodCoerce } from '../src/openapi/zod-coerce'

describe('with valid data', () => {
  const schema = z.number().or(z.string())

  const data = 1234

  bench('without zodCoerce', () => {
    schema.parse(data)
  })

  bench('with zodCoerce', () => {
    schema.parse(zodCoerce(schema, data))
  })
})

describe('simple', () => {
  const schema = z.number().optional()

  const data = '1234'

  bench('without zodCoerce', () => {
    schema.safeParse(data)
  })

  bench('with zodCoerce', () => {
    schema.parse(zodCoerce(schema, data, { bracketNotation: true }))
  })
})

describe('with unions', () => {
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

  bench('without zodCoerce', () => {
    schema.safeParse(data)
  })

  bench('with zodCoerce', () => {
    schema.parse(zodCoerce(schema, data, { bracketNotation: true }))
  })
})

describe('with deep unions', () => {
  const schema = z.object({
    a: z.union([z.number(), z.date()]),
    b: z.union([z.number(), z.date()]),
    c: z
      .object({
        a: z.union([z.object({ a: z.number() }), z.object({ a: z.date() })]),
        b: z.map(z.string(), z.number()),
      })
      .or(z.object({ b: z.number() })),
  })

  const data = {
    a: '2023-01-01',
    b: '123',
    c: {
      a: { a: '2023-01-01' },
      b: [
        ['a', 1],
        ['b', 2],
      ],
    },
  }

  bench('without zodCoerce', () => {
    schema.safeParse(data)
  })

  bench('with zodCoerce', () => {
    schema.parse(zodCoerce(schema, data, { bracketNotation: true }))
  })
})
