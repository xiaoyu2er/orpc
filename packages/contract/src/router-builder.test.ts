import { z } from 'zod'
import { ContractProcedure } from './procedure'
import { DecoratedContractProcedure } from './procedure-decorated'
import { ContractRouterBuilder } from './router-builder'

const schema = z.object({
  value: z.string(),
})

const procedure = new ContractProcedure({ InputSchema: schema, OutputSchema: undefined, route: { path: '/procedure' } })
const decorated = DecoratedContractProcedure.decorate(procedure)

const router = {
  procedure,
  decorated,
  nested: {
    procedure,
    decorated,
  },
}

const builder = new ContractRouterBuilder({})

describe('prefix', () => {
  it('works', () => {
    expect(builder.prefix('/1').prefix('/2')['~orpc'].prefix).toEqual('/1/2')
  })
})

describe('tag', () => {
  it('works', () => {
    expect(builder.tag('1', '2').tag('3')['~orpc'].tags).toEqual(['1', '2', '3'])
  })
})

describe('router', () => {
  it('adapt all procedures', () => {
    const routed = builder.router(router)

    expect(routed.procedure).instanceOf(DecoratedContractProcedure)
    expect(routed.decorated).instanceOf(DecoratedContractProcedure)
    expect(routed.nested.procedure).instanceOf(DecoratedContractProcedure)
    expect(routed.nested.decorated).instanceOf(DecoratedContractProcedure)
  })

  it('adapt with prefix and tags', () => {
    const routed = builder
      .prefix('/p1')
      .prefix('/p2')
      .tag('t1', 't2')
      .tag('t3')
      .router(router)

    expect(routed.procedure).instanceOf(DecoratedContractProcedure)
    expect(routed.decorated).instanceOf(DecoratedContractProcedure)
    expect(routed.nested.procedure).instanceOf(DecoratedContractProcedure)
    expect(routed.nested.decorated).instanceOf(DecoratedContractProcedure)

    expect(routed.procedure['~orpc'].route?.path).toEqual('/p1/p2/procedure')
    expect(routed.decorated['~orpc'].route?.path).toEqual('/p1/p2/procedure')
    expect(routed.nested.procedure['~orpc'].route?.path).toEqual('/p1/p2/procedure')
    expect(routed.nested.decorated['~orpc'].route?.path).toEqual('/p1/p2/procedure')
  })
})
