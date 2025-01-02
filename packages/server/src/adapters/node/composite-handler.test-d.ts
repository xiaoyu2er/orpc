import type { ConditionalRequestHandler, RequestHandler } from './types'
import { CompositeHandler } from './composite-handler'

describe('CompositeHandler - Type Tests', () => {
  it('requires ConditionalFetchHandler', () => {
    void new CompositeHandler([
      {} as ConditionalRequestHandler<any>,
      // @ts-expect-error -- should be ConditionalFetchHandler
      {} as RequestHandler<any>,
      // @ts-expect-error -- should be ConditionalFetchHandler
      {},
    ])
  })

  it('infers context type', () => {
    const handler = new CompositeHandler([
      {} as ConditionalRequestHandler<{ auth: boolean }>,
    ])

    handler.handle({} as any, {} as any, { context: { auth: true } })
    // @ts-expect-error -- invalid context type
    handler.handle({} as any, {} as any, { context: { auth: 'invalid' } })
  })
})
