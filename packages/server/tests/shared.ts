import type { Meta } from '@orpc/contract'
import type { baseErrorMap, BaseMeta, inputSchema, outputSchema } from '../../contract/tests/shared'
import type { Context } from '../src'
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
