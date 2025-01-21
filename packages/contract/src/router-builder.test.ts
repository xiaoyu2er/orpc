import { z } from 'zod'
import { ContractProcedure } from './procedure'
import { DecoratedContractProcedure } from './procedure-decorated'
import { ContractRouterBuilder } from './router-builder'

const schema = z.object({
  value: z.string(),
})

const baseErrorMap = {
  BASE: {
    status: 401,
    data: z.string(),
  },
}

const procedure = new ContractProcedure({
  InputSchema: schema,
  outputSchema: undefined,
  route: { path: '/procedure', tags: ['p1'] },
  errorMap: baseErrorMap,
})
const decorated = DecoratedContractProcedure.decorate(procedure)

const router = {
  procedure,
  decorated,
  nested: {
    procedure,
    decorated,
  },
}

const builderErrorMap = {
  BUILDER: {
    status: 401,
    data: z.string(),
  },
}

const builder = new ContractRouterBuilder({
  prefix: '/api',
  tags: ['tag1', 'tag2'],
  errorMap: builderErrorMap,
})

describe('prefix', () => {
  it('works', () => {
    expect(builder.prefix('/1').prefix('/2')['~orpc'].prefix).toEqual('/api/1/2')
  })
})

describe('tag', () => {
  it('works', () => {
    expect(builder.tag('1', '2').tag('3')['~orpc'].tags).toEqual(['tag1', 'tag2', '1', '2', '3'])
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
    expect(builder.errors(errors)['~orpc'].errorMap).toEqual({
      ...errors,
      ...builder['~orpc'].errorMap,
    })
  })
})

describe('router', () => {
  it('adapt all procedures', () => {
    const routed = builder.router(router)

    expect(routed.procedure).instanceOf(DecoratedContractProcedure)
    expect(routed.procedure['~orpc'].route?.path).toEqual('/api/procedure')
    expect(routed.procedure['~orpc'].route?.tags).toEqual(['tag1', 'tag2', 'p1'])
    expect(routed.procedure['~orpc'].errorMap).toEqual({ ...builderErrorMap, ...baseErrorMap })

    expect(routed.decorated).instanceOf(DecoratedContractProcedure)
    expect(routed.decorated['~orpc'].route?.path).toEqual('/api/procedure')
    expect(routed.decorated['~orpc'].route?.tags).toEqual(['tag1', 'tag2', 'p1'])
    expect(routed.decorated['~orpc'].errorMap).toEqual({ ...builderErrorMap, ...baseErrorMap })

    expect(routed.nested.procedure).instanceOf(DecoratedContractProcedure)
    expect(routed.nested.procedure['~orpc'].route?.path).toEqual('/api/procedure')
    expect(routed.nested.procedure['~orpc'].route?.tags).toEqual(['tag1', 'tag2', 'p1'])
    expect(routed.nested.procedure['~orpc'].errorMap).toEqual({ ...builderErrorMap, ...baseErrorMap })

    expect(routed.nested.decorated).instanceOf(DecoratedContractProcedure)
    expect(routed.nested.decorated['~orpc'].route?.path).toEqual('/api/procedure')
    expect(routed.nested.decorated['~orpc'].route?.tags).toEqual(['tag1', 'tag2', 'p1'])
    expect(routed.nested.decorated['~orpc'].errorMap).toEqual({ ...builderErrorMap, ...baseErrorMap })
  })
})
