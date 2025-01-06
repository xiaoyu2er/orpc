import type { FetchHandler } from './types'

describe('FetchHandler', () => {
  it('optional context when context is undefinable', () => {
    const handler = {} as FetchHandler<{ auth: boolean } | undefined>

    handler.handle(new Request('https://example.com'))
    handler.handle(new Request('https://example.com'), { context: { auth: true } })

    const handler2 = {} as FetchHandler<{ auth: boolean }>

    handler2.handle(new Request('https://example.com'), { context: { auth: true } })
    // @ts-expect-error -- context is required
    handler2.handle(new Request('https://example.com'))
  })
})
