import type { ORPCError } from './error'
import type { Client, ClientContext } from './types'
import { isDefinedError } from './error'
import { safe } from './utils'

it('safe', async () => {
  const client = {} as Client<ClientContext, string, number, Error | ORPCError<'BAD_GATEWAY', { val: string }>>

  const [output, error, isDefined] = await safe(client('123'))

  if (!error) {
    expectTypeOf(output).toEqualTypeOf<number>()
  }

  if (isDefined) {
    expectTypeOf(error).toEqualTypeOf<ORPCError<'BAD_GATEWAY', { val: string }>>()
  }

  if (error) {
    expectTypeOf(error).toEqualTypeOf<Error | ORPCError<'BAD_GATEWAY', { val: string }>>()

    if (isDefinedError(error)) {
      expectTypeOf(error).toEqualTypeOf<ORPCError<'BAD_GATEWAY', { val: string }>>()
    }
  }
})
