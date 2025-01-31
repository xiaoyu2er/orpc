import type { Client, ErrorFromErrorMap, NestedClient } from '@orpc/contract'
import type { baseErrorMap } from '../../contract/tests/shared'
import type { router } from '../tests/shared'
import type { RouterClient } from './router-client'

const routerClient = {} as RouterClient<typeof router, 'client-context'>

describe('RouterClient', () => {
  it('is a nested client', () => {
    expectTypeOf(routerClient).toMatchTypeOf<NestedClient<'client-context'>>()
  })

  it('works', () => {
    expectTypeOf(routerClient.ping).toEqualTypeOf<
      Client<'client-context', { input: number }, { output: string }, ErrorFromErrorMap<typeof baseErrorMap>>
    >()

    expectTypeOf(routerClient.nested.ping).toEqualTypeOf<
      Client<'client-context', { input: number }, { output: string }, ErrorFromErrorMap<typeof baseErrorMap>>
    >()

    expectTypeOf(routerClient.pong).toEqualTypeOf<
      Client<'client-context', unknown, unknown, Error>
    >()

    expectTypeOf(routerClient.nested.pong).toEqualTypeOf<
      Client<'client-context', unknown, unknown, Error>
    >()
  })
})
