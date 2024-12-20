import type { SchemaInput, SchemaOutput } from '@orpc/contract'
import type { QueryClient } from '@tanstack/react-query'
import type { GeneralHooks } from './general-hooks'
import type { GeneralUtils } from './general-utils'
import type { ProcedureHooks } from './procedure-hooks'
import type { ProcedureUtils } from './procedure-utils'
import {
  orpc,
  orpcClient,
  ORPCContext,
  type UserFindInputSchema,
  type UserSchema,
} from '../tests/orpc'
import { useQueriesFactory } from './use-queries/hook'

type UserFindInput = SchemaInput<typeof UserFindInputSchema>
type User = SchemaOutput<typeof UserSchema>

describe('useUtils', () => {
  const utils = orpc.useUtils()

  it('router level', () => {
    expectTypeOf(utils).toMatchTypeOf<
      GeneralUtils<unknown, unknown>
    >()

    expectTypeOf(utils.user).toMatchTypeOf<
      GeneralUtils<unknown, unknown>
    >()
  })

  it('procedure level', () => {
    expectTypeOf(utils.user.find).toMatchTypeOf<
      GeneralUtils<
        UserFindInput,
        User
      >
    >()

    expectTypeOf(utils.user.find).toMatchTypeOf<
      ProcedureUtils<
        UserFindInput,
        User
      >
    >()
  })
})

it('useContext', () => {
  const context = orpc.useContext()

  expectTypeOf(context.client).toEqualTypeOf(orpcClient)
  expectTypeOf(context.queryClient).toEqualTypeOf<QueryClient>()
})

it('useQueries', () => {
  expectTypeOf(orpc.useQueries).toEqualTypeOf(
    useQueriesFactory({ context: ORPCContext }),
  )
})

describe('hooks', () => {
  it('router level', () => {
    expectTypeOf(orpc).toMatchTypeOf<
      GeneralHooks<unknown, unknown>
    >()

    expectTypeOf(orpc.user).toMatchTypeOf<
      GeneralHooks<unknown, unknown>
    >()
  })

  it('procedure level', () => {
    expectTypeOf(orpc.user.find).toMatchTypeOf<
      GeneralHooks<
        UserFindInput,
        User
      >
    >()

    expectTypeOf(orpc.user.find).toMatchTypeOf<
      ProcedureHooks<
        UserFindInput,
        User
      >
    >()
  })
})
