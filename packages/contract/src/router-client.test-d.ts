import type { NestedClient } from '@orpc/client'
import type { baseErrorMap, inputSchema, outputSchema, router } from '../tests/shared'
import type { ContractProcedureClient } from './procedure-client'
import type { ContractRouterClient } from './router-client'

it('ContractRouterClient', () => {
  const routerClient = {} as ContractRouterClient<typeof router, { cache?: boolean }>
  expectTypeOf(routerClient).toMatchTypeOf<NestedClient<{ cache?: boolean }>>()

  expectTypeOf(routerClient.ping).toEqualTypeOf<
    ContractProcedureClient<{ cache?: boolean }, typeof inputSchema, typeof outputSchema, typeof baseErrorMap>
  >()

  expectTypeOf(routerClient.pong).toEqualTypeOf<
    ContractProcedureClient<{ cache?: boolean }, undefined, undefined, Record<never, never>>
  >()

  expectTypeOf(routerClient.nested.ping).toEqualTypeOf<
    ContractProcedureClient<{ cache?: boolean }, typeof inputSchema, typeof outputSchema, typeof baseErrorMap>
  >()

  expectTypeOf(routerClient.nested.pong).toEqualTypeOf<
    ContractProcedureClient<{ cache?: boolean }, undefined, undefined, Record<never, never>>
  >()
})
