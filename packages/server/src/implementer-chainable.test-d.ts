import type { MergedRoute, StrictRoute } from '@orpc/contract'
import type { Context, TypeCurrentContext, TypeInitialContext } from './context'
import type { ChainableImplementer } from './implementer-chainable'
import type { Middleware } from './middleware'
import type { ProcedureBuilderWithoutHandler } from './procedure-builder-without-handler'
import type { RouterImplementer } from './router-implementer'
import { oc } from '@orpc/contract'
import { z } from 'zod'
import { createChainableImplementer } from './implementer-chainable'

const schema = z.object({ val: z.string().transform(val => Number(val)) })

const route = { method: 'GET', path: '/ping' } as const
const ping = oc.input(schema).output(schema)
const pong = oc.route(route)

const contract = oc.router({
  ping,
  pong,
  nested: {
    ping,
    pong,
  },
})

describe('ChainableImplementer', () => {
  it('with procedure', () => {
    expectTypeOf(createChainableImplementer(ping, { middlewares: [], inputValidationIndex: 0, outputValidationIndex: 0 })).toEqualTypeOf<
      ProcedureBuilderWithoutHandler<Context, Context, typeof schema, typeof schema, Record<never, never>, StrictRoute<Record<never, never>>>
    >()

    expectTypeOf(createChainableImplementer(pong, { middlewares: [], inputValidationIndex: 0, outputValidationIndex: 0 })).toEqualTypeOf<
      ProcedureBuilderWithoutHandler<Context, Context, undefined, undefined, Record<never, never>, MergedRoute<StrictRoute<Record<never, never>>, typeof route>>
    >()
  })

  it('with router', () => {
    const implementer = createChainableImplementer(contract, { middlewares: [], inputValidationIndex: 0, outputValidationIndex: 0 })

    expectTypeOf(implementer).toMatchTypeOf<
      Omit<RouterImplementer<Context, Context, typeof contract>, '~type' | '~orpc'>
    >()

    expectTypeOf(implementer.ping).toEqualTypeOf<
      ProcedureBuilderWithoutHandler<Context, Context, typeof schema, typeof schema, Record<never, never>, StrictRoute<Record<never, never>>>
    >()

    expectTypeOf(implementer.pong).toEqualTypeOf<
      ProcedureBuilderWithoutHandler<Context, Context, undefined, undefined, Record<never, never>, MergedRoute<StrictRoute<Record<never, never>>, typeof route>>
    >()

    expectTypeOf(implementer.nested).toMatchTypeOf<
      Omit<RouterImplementer<Context, Context, typeof contract.nested>, '~type' | '~orpc'>
    >()

    expectTypeOf(implementer.nested.ping).toEqualTypeOf<
      ProcedureBuilderWithoutHandler<Context, Context, typeof schema, typeof schema, Record<never, never>, StrictRoute<Record<never, never>>>
    >()

    expectTypeOf(implementer.nested.pong).toEqualTypeOf<
      ProcedureBuilderWithoutHandler<Context, Context, undefined, undefined, Record<never, never>, MergedRoute<StrictRoute<Record<never, never>>, typeof route>>
    >()
  })

  it('not expose properties of router implementer', () => {
    const implementer = createChainableImplementer(contract, { middlewares: [], inputValidationIndex: 0, outputValidationIndex: 0 })

    expectTypeOf(implementer).not.toHaveProperty('~orpc')
    expectTypeOf(implementer).not.toHaveProperty('~type')
    expectTypeOf(implementer.router).not.toHaveProperty('~orpc')
    expectTypeOf(implementer.router).not.toHaveProperty('~type')
  })

  it('works on conflicted', () => {
    const contract = oc.router({
      use: ping,
      router: {
        use: ping,
        router: pong,
      },
    })

    const implementer = createChainableImplementer(contract, { middlewares: [], inputValidationIndex: 0, outputValidationIndex: 0 })

    expectTypeOf(implementer).toMatchTypeOf<
      Omit<RouterImplementer<Context, Context, typeof contract>, '~type' | '~orpc'>
    >()

    expectTypeOf(implementer.use).toMatchTypeOf<
      ProcedureBuilderWithoutHandler<Context, Context, typeof schema, typeof schema, Record<never, never>, Record<never, never>>
    >()

    expectTypeOf(implementer.router).toMatchTypeOf<
      Omit<RouterImplementer<Context, Context, typeof contract.router>, '~type' | '~orpc'>
    >()

    expectTypeOf(implementer.router.use).toMatchTypeOf<
      ProcedureBuilderWithoutHandler<Context, Context, typeof schema, typeof schema, Record<never, never>, Record<never, never>>
    >()

    expectTypeOf(implementer.router.router).toMatchTypeOf<
      ProcedureBuilderWithoutHandler<Context, Context, undefined, undefined, Record<never, never>, Record<never, never> & typeof route>
    >()
  })
})

describe('createChainableImplementer', () => {
  it('with procedure', () => {
    const implementer = createChainableImplementer(ping, { middlewares: [], inputValidationIndex: 0, outputValidationIndex: 0 })
    expectTypeOf(implementer).toEqualTypeOf<ChainableImplementer<Context, Context, typeof ping>>()
  })

  it('with router', () => {
    const implementer = createChainableImplementer(contract, { middlewares: [], inputValidationIndex: 0, outputValidationIndex: 0 })
    expectTypeOf(implementer).toEqualTypeOf<ChainableImplementer<Context, Context, typeof contract>>()
  })

  it('with middlewares', () => {
    const mid = {} as Middleware<{ auth: boolean }, { db: string }, unknown, unknown, Record<never, never>>
    const implementer = createChainableImplementer(contract, {
      __initialContext: {} as TypeInitialContext<{ auth: boolean }>,
      __currentContext: {} as TypeCurrentContext<{ auth: boolean } & { db: string }>,
      middlewares: [mid],
      inputValidationIndex: 1,
      outputValidationIndex: 1,
    })
    expectTypeOf(implementer).toEqualTypeOf<
      ChainableImplementer<{ auth: boolean }, { auth: boolean } & { db: string }, typeof contract>
    >()
  })
})
