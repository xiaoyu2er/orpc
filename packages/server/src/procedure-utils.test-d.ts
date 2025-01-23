import type { ORPCError } from '@orpc/contract'
import type { ReadonlyDeep } from '@orpc/shared'
import { safe } from '@orpc/contract'
import { ping, pong } from '../tests/shared'
import { call } from './procedure-utils'

it('call', async () => {
  const [output, error, isDefined] = await safe(call(ping, { input: 123 }, { context: { db: 'postgres' } }))

  if (!error) {
    expectTypeOf(output).toEqualTypeOf<{ output: string }>()
  }

  if (isDefined) {
    expectTypeOf(error).toEqualTypeOf<ORPCError<'BASE', ReadonlyDeep<{ output: string }>>>()
  }

  // @ts-expect-error - invalid input
  call(ping, { input: '123' }, { context: { db: 'postgres' } })

  // can call without third argument if all context fields is optional
  call(pong, { input: 123 })
  // @ts-expect-error - context is required
  call(ping, { input: 123 })
  // @ts-expect-error - invalid context
  call(ping, { input: 123 }, { context: { db: 123 } })
})
