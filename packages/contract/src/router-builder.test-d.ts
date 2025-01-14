import type { AdaptedContractRouter, ContractRouterBuilder } from './router-builder'
import { z } from 'zod'
import { ContractProcedure } from './procedure'
import { DecoratedContractProcedure } from './procedure-decorated'

const schema = z.object({
  value: z.string().transform(() => 1),
})

const baseErrors = {
  BASE: {
    status: 401,
    data: z.string(),
  },
} as const

const ping = new ContractProcedure({ InputSchema: schema, OutputSchema: undefined, route: { path: '/procedure' }, errorMap: baseErrors })
const pinged = DecoratedContractProcedure.decorate(ping)

const pong = new ContractProcedure({ InputSchema: undefined, OutputSchema: schema, errorMap: {} })
const ponged = DecoratedContractProcedure.decorate(pong)

const router = {
  ping,
  pinged,
  pong,
  ponged,
  nested: {
    ping,
    pinged,
    pong,
    ponged,
  },
}

const builder = {} as ContractRouterBuilder<typeof baseErrors>

describe('AdaptedContractRouter', () => {
  it('decorate and add extra context', () => {
    const extraErrors = {
      CODE: {
        message: 'Error',
        data: z.string(),
      },
    } as const

    expectTypeOf<AdaptedContractRouter<typeof router, typeof extraErrors>['ping']>().toEqualTypeOf<
      DecoratedContractProcedure<typeof schema, undefined, typeof baseErrors & typeof extraErrors>
    >()

    expectTypeOf<AdaptedContractRouter<typeof router, typeof extraErrors>['pinged']>().toEqualTypeOf<
      DecoratedContractProcedure<typeof schema, undefined, typeof baseErrors & typeof extraErrors>
    >()

    expectTypeOf<AdaptedContractRouter<typeof router, typeof extraErrors>['nested']['pong']>().toEqualTypeOf<
      DecoratedContractProcedure<undefined, typeof schema, typeof extraErrors>
    >()
  })

  it('throw error on invalid procedure', () => {
    const router = {
      a: 1,
    }

    // @ts-expect-error - invalid procedure
    type Adapted = AdaptedContractRouter<typeof router>
  })
})

describe('router', () => {
  it('return adapted router', () => {
    const routed = builder.router(router)

    expectTypeOf(routed).toEqualTypeOf<AdaptedContractRouter<typeof router, typeof baseErrors>>()

    expectTypeOf(builder.router(ping)).toEqualTypeOf<AdaptedContractRouter<typeof ping, typeof baseErrors>>()
  })

  it('throw on conflict error map', () => {
    builder.router({ ping: {} as ContractProcedure<any, any, { BASE: typeof baseErrors['BASE'] }> })
    // @ts-expect-error conflict
    builder.router({ ping: {} as ContractProcedure<any, any, { BASE: { message: string } }> })
  })

  it('only required partial match error map', () => {
    expectTypeOf(builder.router({ ping: {} as ContractProcedure<any, any, { OTHER: { status: number } }> })).toEqualTypeOf<{
      ping: DecoratedContractProcedure<any, any, { OTHER: { status: number } } & typeof baseErrors>
    }>()
  })

  it('throw error on invalid router', () => {
    const router = {
      a: 1,
    }

    // @ts-expect-error - invalid router
    const routed = builder.router(router)
  })
})

describe('prefix', () => {
  it('return ContractRouterBuilder', () => {
    const routed = builder.prefix('/api')
    expectTypeOf(routed).toEqualTypeOf<ContractRouterBuilder<typeof baseErrors>>()
  })

  it('require valid prefix', () => {
    builder.prefix('/api')

    // @ts-expect-error - invalid prefix
    builder.prefix(1)
    // @ts-expect-error - invalid prefix
    builder.prefix('')
  })
})

describe('tag', () => {
  it('return ContractRouterBuilder', () => {
    const applied = builder.tag('tag')
    expectTypeOf(applied).toEqualTypeOf<ContractRouterBuilder<typeof baseErrors>>()
  })

  it('require valid tag', () => {
    builder.tag('tag')

    // @ts-expect-error - invalid tag
    builder.tag(1)
    // @ts-expect-error - invalid tag
    builder.tag({})
  })
})

describe('errors', () => {
  const errors = {
    BAD: {
      status: 500,
      data: schema,
    },
  }

  it('merge old one', () => {
    expectTypeOf(builder.errors(errors)).toEqualTypeOf<
      ContractRouterBuilder<typeof errors & typeof baseErrors>
    >()
  })

  it('prevent redefine errorMap', () => {
    // @ts-expect-error - not allow redefine errorMap
    builder.errors({ BASE: baseErrors.BASE })
    // @ts-expect-error - not allow redefine errorMap --- even with undefined
    builder.errors({ BASE: undefined })
  })
})
