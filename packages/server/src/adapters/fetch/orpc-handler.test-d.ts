import type { WithSignal } from '../..'
import type { FetchHandleResult } from './types'
import { os } from '../..'
import { ORPCHandler } from './orpc-handler'

describe('oRPCHandler', () => {
  it('hooks', () => {
    const router = {
      ping: os.context<{ userId?: string }>().handler(() => 'pong'),
    }

    const handler = new ORPCHandler(router, {
      onSuccess(state, context, meta) {
        expectTypeOf(state.input).toEqualTypeOf<Request>()
        expectTypeOf(state.output).toEqualTypeOf<FetchHandleResult>()
        expectTypeOf(context).toEqualTypeOf<{ userId?: string }>()
        expectTypeOf(meta).toEqualTypeOf<WithSignal>()
      },
    })
  })
})
