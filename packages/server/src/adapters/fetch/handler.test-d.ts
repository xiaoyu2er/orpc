import type { StandardHandlerPlugin } from '../standard'
import type { FetchHandler, FetchHandlerPlugin } from './handler'

describe('FetchHandlerPlugin', () => {
  it('backward compatibility', () => {
    expectTypeOf<FetchHandlerPlugin<{ a: string }>>().toMatchTypeOf<StandardHandlerPlugin<{ a: string }>>()
    expectTypeOf<StandardHandlerPlugin<{ a: string }>>().toMatchTypeOf<FetchHandlerPlugin<{ a: string }>>()
  })
})

describe('FetchHandler', () => {
  it('optional context when all context is optional', () => {
    const handler = {} as FetchHandler<{ auth?: boolean }>

    handler.handle(new Request('https://example.com'))
    handler.handle(new Request('https://example.com'), { context: { auth: true } })

    const handler2 = {} as FetchHandler<{ auth: boolean }>

    handler2.handle(new Request('https://example.com'), { context: { auth: true } })
    // @ts-expect-error -- context is required
    handler2.handle(new Request('https://example.com'))
  })
})
