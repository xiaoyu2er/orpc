import { bench } from 'vitest'
import { z } from 'zod'
import { coerceParse } from './parse'

describe('simple', () => {
  const schema = z.number()

  const data = '1234'

  bench('raw zod parse', () => {
    schema.safeParse(data)
  })

  bench('coerce parse', () => {
    coerceParse(schema, data)
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

  bench('raw zod parse', () => {
    schema.safeParse(data)
  })

  bench('coerce parse', () => {
    coerceParse(schema, data)
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

  bench('raw zod parse', () => {
    schema.safeParse(data)
  })

  bench('coerce parse', () => {
    coerceParse(schema, data)
  })
})
