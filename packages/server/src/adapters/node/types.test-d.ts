import type { IncomingMessage, ServerResponse } from 'node:http'
import type { RequestHandler } from './types'

describe('RequestHandler', () => {
  const req = {} as IncomingMessage
  const res = {} as ServerResponse

  it('optional second argument when context is not required', () => {
    const handler = {} as RequestHandler<{ auth: boolean } | undefined>

    handler.handle(req, res)
    handler.handle(req, res, { context: { auth: true } })

    const handler2 = {} as RequestHandler<{ auth: boolean }>

    // @ts-expect-error -- context is required
    handler2.handle(req, res)
    handler2.handle(req, res, { context: { auth: true } })
  })

  it('returnFalseOnNoMatch option', () => {
    const handler = {} as RequestHandler<undefined>

    expectTypeOf(
      handler.handle(req, res),
    ).toEqualTypeOf<Promise<void>>()

    expectTypeOf(
      handler.handle(req, res, { returnFalseOnNoMatch: true }),
    ).toEqualTypeOf<Promise<false | void>>()
  })
})
