import type { InferRouterInitialContext, Lazyable, Procedure, Schema, Router, ContractRouter } from '@orpc/server'
import type { ToORPCRouterResult } from './to-orpc-router'
import { inferRouterContext } from '@trpc/server'
import { inferRouterMeta } from '@trpc/server/unstable-core-do-not-import'
import { TRPCContext, TRPCMeta, trpcRouter } from '../tests/shared'

it('ToORPCRouterResult', () => {
  const orpcRouter = {} as ToORPCRouterResult<
    inferRouterContext<typeof trpcRouter>,
      inferRouterMeta<typeof trpcRouter>,
      typeof trpcRouter['_def']['record']
  >

  expectTypeOf(orpcRouter).toExtend<Router<ContractRouter<TRPCMeta>, TRPCContext>>()

  expectTypeOf<InferRouterInitialContext<typeof orpcRouter>>().toEqualTypeOf<{ a: string }>()

  expectTypeOf(orpcRouter.ping).toEqualTypeOf<
    Lazyable<Procedure<TRPCContext, object, Schema<{ a: string }, unknown>, Schema<unknown, number>, object, TRPCMeta>>
  >()

  expectTypeOf(orpcRouter.pong).toEqualTypeOf<
    Lazyable<Procedure<TRPCContext, object, Schema<{ b: number, c: string }, unknown>, Schema<unknown, string>, object, TRPCMeta>>
  >()

    expectTypeOf(orpcRouter.subscribe).toEqualTypeOf<
        Lazyable<Procedure<TRPCContext, object, Schema<{ u: string }, unknown>, Schema<unknown, AsyncIterable<string, void, any>>, object, TRPCMeta>>
    >()

  expectTypeOf(orpcRouter.nested).toEqualTypeOf<
    Lazyable<{
      subscribe: Lazyable < Procedure<TRPCContext, object, Schema<void, unknown>, Schema<unknown, AsyncIterable<string, void, any>>, object, TRPCMeta>>
        nested: Lazyable<{
            pong: Lazyable<Procedure<TRPCContext, object, Schema<{ d: boolean }, unknown>, Schema<unknown, string>, object, TRPCMeta>>
        }>
    }>
  >()
})
