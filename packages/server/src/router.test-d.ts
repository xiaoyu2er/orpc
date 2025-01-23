import type { ContractRouter, ErrorMap } from '@orpc/contract'
import type { baseErrorMap, BaseMetaDef } from '../../contract/tests/shared'
import type { InitialContext } from '../tests/shared'
import type { Context } from './context'
import type { Router } from './router'
import { ping, pong, router } from '../tests/shared'

describe('Router', () => {
  it('context', () => {
    expectTypeOf(ping).toMatchTypeOf<Router<InitialContext, any>>()
    expectTypeOf(pong).toMatchTypeOf<Router<InitialContext, any>>()
    expectTypeOf(router).toMatchTypeOf<Router<InitialContext, any>>()

    expectTypeOf(ping).not.toMatchTypeOf<Router<Context, any>>()

    // this pattern can prevent conflict initial context, error map, meta def between router and procedure
    expectTypeOf(router).toMatchTypeOf<Router<InitialContext, ContractRouter<ErrorMap & Partial<typeof baseErrorMap>, BaseMetaDef>>>()
  })
})
