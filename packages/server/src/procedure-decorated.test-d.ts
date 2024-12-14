import { ContractProcedure } from '@orpc/contract'
import { Procedure } from './procedure'
import { decorateProcedure } from './procedure-decorated'

const procedure = new Procedure({
  contract: new ContractProcedure({
    InputSchema: undefined,
    OutputSchema: undefined,
  }),
  func: () => {},
})

const decorated = decorateProcedure(procedure)

describe('prefix', () => {
  it('works', () => {
    expectTypeOf(decorated.prefix('/test')).toEqualTypeOf<typeof decorated>()

    // @ts-expect-error - invalid prefix
    decorated.prefix('')
    // @ts-expect-error - invalid prefix
    decorated.prefix(1)
  })
})

describe('route', () => {
  it('works', () => {
    expectTypeOf(decorated.route({ path: '/test', method: 'GET' })).toEqualTypeOf<typeof decorated>()
    expectTypeOf(decorated.route({
      path: '/test',
      method: 'GET',
      description: 'description',
      summary: 'summary',
      deprecated: true,
      tags: ['tag1', 'tag2'],
    })).toEqualTypeOf<typeof decorated>()

    // @ts-expect-error - invalid method
    decorated.route({ method: 'PUTT' })
    // @ts-expect-error - invalid path
    decorated.route({ path: 1 })
    // @ts-expect-error - invalid tags
    decorated.route({ tags: [1] })
  })
})

describe('unshiftTag', () => {
  it('works', () => {
    expectTypeOf(decorated.unshiftTag('test')).toEqualTypeOf<typeof decorated>()
    expectTypeOf(decorated.unshiftTag('test', 'test2', 'test3')).toEqualTypeOf<typeof decorated>()

    // @ts-expect-error - invalid tag
    decorated.unshiftTag(1)
    // @ts-expect-error - invalid tag
    decorated.unshiftTag('123', 2)
  })
})

describe('unshiftMiddleware', () => {
  it('works', () => {
    expectTypeOf(decorated.unshiftMiddleware(() => {})).toEqualTypeOf<typeof decorated>()
    expectTypeOf(decorated.unshiftMiddleware(() => {}, () => {})).toEqualTypeOf<typeof decorated>()

    // @ts-expect-error - invalid middleware
    decorated.unshiftMiddleware(1)
    // @ts-expect-error - invalid middleware
    decorated.unshiftMiddleware(() => {}, 1)
  })
})
