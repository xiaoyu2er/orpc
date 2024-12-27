import type { ConditionalFetchHandler, FetchHandler } from './types'
import { CompositeHandler } from './composite-handler'

describe('CompositeHandler - Type Tests', () => {
  it('requires ConditionalFetchHandler', () => {
    void new CompositeHandler([
      {} as ConditionalFetchHandler<any>,
      // @ts-expect-error -- should be ConditionalFetchHandler
      {} as FetchHandler<any>,
      // @ts-expect-error -- should be ConditionalFetchHandler
      {},
    ])
  })

  it('infers context type', () => {
    const handler = new CompositeHandler([
      {} as ConditionalFetchHandler<{ auth: boolean }>,
    ])

    handler.fetch(new Request('https://example.com'), { context: { auth: true } })
    // @ts-expect-error -- invalid context type
    handler.fetch(new Request('https://example.com'), { context: { auth: 'invalid' } })
  })
})
