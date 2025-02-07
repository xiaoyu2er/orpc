import type { Meta } from '@orpc/contract'
import type { baseErrorMap, BaseMeta, inputSchema, outputSchema } from '../../contract/tests/shared'
import type { Context } from '../src'
import { expect } from 'vitest'
import { ping as pingContract, pong as pongContract } from '../../contract/tests/shared'
import { lazy, Procedure } from '../src'

export type InitialContext = { db: string }
export type CurrentContext = InitialContext & { auth: boolean }

export const pingHandler = vi.fn(({ input }) => ({ output: Number(input.input) }))
export const pingMiddleware = vi.fn(({ next }) => next())

export const ping = new Procedure<
  InitialContext,
  CurrentContext,
  typeof inputSchema,
  typeof outputSchema,
  { output: number },
  typeof baseErrorMap,
  BaseMeta
>({
  ...pingContract['~orpc'],
  middlewares: [pingMiddleware],
  handler: pingHandler,
  inputValidationIndex: 1,
  outputValidationIndex: 1,
})

export const pongHandler = vi.fn(({ input }) => input)

export const pong = new Procedure<
  Context,
  Context,
  undefined,
  undefined,
  unknown,
  Record<never, never>,
  Meta
>({
  ...pongContract['~orpc'],
  middlewares: [],
  handler: pongHandler,
  inputValidationIndex: 0,
  outputValidationIndex: 0,
})

export const router = {
  ping: lazy(() => Promise.resolve({ default: ping })),
  pong,
  nested: lazy(() => Promise.resolve({
    default: {
      ping,
      pong: lazy(() => Promise.resolve({ default: pong })),
    },
  })),
}

enum Test {
  A = 1,
  B = 2,
  C = 'C',
  D = 'D',
}

/**
 * The data types that oRPC guarantees to be supported.
 */
export const supportedDataTypes: { name: string, value: unknown, expected: unknown }[] = [
  {
    name: 'enum',
    value: Test.B,
    expected: Test.B,
  },
  {
    name: 'string',
    value: 'some-string',
    expected: 'some-string',
  },
  {
    name: 'number',
    value: 123,
    expected: 123,
  },
  {
    name: 'NaN',
    value: Number.NaN,
    expected: Number.NaN,
  },
  {
    name: 'true',
    value: true,
    expected: true,
  },
  {
    name: 'false',
    value: false,
    expected: false,
  },
  {
    name: 'null',
    value: null,
    expected: null,
  },
  {
    name: 'undefined',
    value: undefined,
    expected: undefined,
  },
  {
    name: 'date',
    value: new Date('2023-01-01'),
    expected: new Date('2023-01-01'),
  },
  {
    name: 'Invalid Date',
    value: new Date('Invalid'),
    expected: new Date('Invalid'),
  },
  {
    name: 'BigInt',
    value: 99999999999999999999999999999n,
    expected: 99999999999999999999999999999n,
  },
  {
    name: 'regex without flags',
    value: /npa|npb/,
    expected: /npa|npb/,
  },
  {
    name: 'regex with flags',
    value: /uic/gi,
    expected: /uic/gi,
  },
  {
    name: 'URL',
    value: new URL('https://unnoq.com'),
    expected: new URL('https://unnoq.com'),
  },
  {
    name: 'object',
    value: { a: 1, b: 2, c: 3 },
    expected: { a: 1, b: 2, c: 3 },
  },
  {
    name: 'array',
    value: [1, 2, 3],
    expected: [1, 2, 3],
  },
  {
    name: 'map',
    value: new Map([[1, 2], [3, 4]]),
    expected: new Map([[1, 2], [3, 4]]),
  },
  {
    name: 'set',
    value: new Set([1, 2, 3]),
    expected: new Set([1, 2, 3]),
  },
  {
    name: 'blob',
    value: new Blob(['blob'], { type: 'text/plain' }),
    expected: expect.toSatisfy((file: any) => {
      expect(file).toBeInstanceOf(Blob)
      expect(file.type).toBe('text/plain')
      expect(file.size).toBe(4)

      return true
    }),
  },
  {
    name: 'file',
    value: new File(['"name"'], 'file.json', { type: 'application/json' }),
    expected: expect.toSatisfy((file: any) => {
      expect(file).toBeInstanceOf(File)
      expect(file.name).toBe('file.json')
      expect(file.type).toBe('application/json')
      expect(file.size).toBe(6)

      return true
    }),
  },
]
