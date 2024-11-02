import { describe } from 'node:test'
import SuperJSON from 'superjson'
import { bench } from 'vitest'
import * as SuperJSON2 from '../src/orpc/super-json'

describe('with simple data', () => {
  const data = {
    a: 1234,
    b: '1234',
    c: true,
    d: null,
    e: undefined,
    f: new Date('2023-01-01'),
    g: BigInt(1234),
    h: [1, 2, 3],
    i: new Set([1, 2, 3]),
    j: new Map([
      [1, 2],
      [3, 4],
    ]),
    k: {
      a: [1, 2, 3],
      b: new Set([1, 2, 3]),
    },
  }

  bench('SuperJSON', () => {
    SuperJSON.deserialize(SuperJSON.serialize(data))
  })

  bench('SuperJSON2', () => {
    SuperJSON2.deserialize(SuperJSON2.serialize(data))
  })
})

describe('with deep data', () => {
  const data = {
    object: {
      o: {
        o: {
          a: 1234,
          b: '1234',
          c: true,
          d: null,
          e: undefined,
          f: new Date('2023-01-01'),
          g: BigInt(1234),
          h: [1, 2, 3],
          i: new Set([1, 2, 3]),
          j: new Map([
            [1, 2],
            [3, 4],
          ]),
          k: {
            a: [1, 2, 3],
            b: new Set([1, 2, 3]),
          },
        },
      },
    },
  }

  bench('SuperJSON', () => {
    SuperJSON.deserialize(SuperJSON.serialize(data))
  })

  bench('SuperJSON2', () => {
    SuperJSON2.deserialize(SuperJSON2.serialize(data))
  })
})
