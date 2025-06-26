import { initTRPC, lazy } from "@trpc/server"
import { z } from "zod/v4"

export type TRPCContext = { a: string }
export type TRPCMeta = { meta1?: string, meta2?: number }
export const t = initTRPC.context<(req: Request) => (TRPCContext)>().meta<TRPCMeta>().create()

export const trpcRouter = t.router({
    ping: t.procedure
      .meta({ meta1: 'test' })
      .input(z.object({ a: z.string() }))
      .output(z.string().transform(val => Number(val)))
      .query(({ input }) => {
        return `1234${input.a}`
      }),

    pong: t.procedure
      .meta({ meta2: 42 })
      .input(z.object({ b: z.number() }))
      .input(z.object({ b: z.number(), c: z.string() }))
      .query(({ input }) => {
        return `ping ${input.b}`
      }),

    subscribe: t.procedure
    .input(z.object({ u: z.string() }))
      .subscription(async function* () {
        yield 'pong'
      }),

    nested: lazy(() => Promise.resolve({ default: t.router({
      subscribe: t.procedure
        .subscription(async function* () {
          yield 'pong'
        }),

      nested: lazy(() => Promise.resolve({ default: t.router({
        pong: t.procedure
          .meta({ meta1: 'nested' })
          .input(z.object({ d: z.boolean() }))
          .output(z.string())
          .query(() => 'nested nested pong'),
      }) })),
    }) })),
  })
