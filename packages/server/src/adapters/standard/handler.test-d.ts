import { router } from '../../../tests/shared'
import { os } from '../../builder'
import { StandardHandler } from './handler'

describe('standardHandler', () => {
  it('can infer router context', () => {
    const handler = new StandardHandler(router, {} as any, {} as any, {})

    handler.handle({} as any, { context: { db: 'postgres' } })
    // @ts-expect-error - invalid context
    handler.handle({} as any, { context: { db: 123 } })
    // @ts-expect-error - missing context
    handler.handle({} as any, {})
    // @ts-expect-error - missing options
    handler.handle({} as any)
  })

  it('not require pass second argument when all context fields is optional', () => {
    const handler = new StandardHandler({
      ping: os.$context<{ db?: string }>().handler(() => 'pong'),
    }, {} as any, {} as any, {} as any)

    handler.handle({} as any)
    handler.handle({} as any, {})
    handler.handle({} as any, { context: {} })
    handler.handle({} as any, { context: { db: 'postgres' } })
    // @ts-expect-error - invalid context
    handler.handle({} as any, { context: { db: 123 } })
  })
})
