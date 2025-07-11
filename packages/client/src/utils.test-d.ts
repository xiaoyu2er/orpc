import type { ORPCError } from './error'
import type { Client, ClientContext } from './types'
import { isDefinedError } from './error'
import { createSafeClient, safe } from './utils'

describe('safe', async () => {
  const client = {} as Client<ClientContext, string, number, Error | ORPCError<'BAD_GATEWAY', { val: string }>>

  it('tuple style', async () => {
    const [error, data, isDefined, isSuccess] = await safe(client('123'))

    if (error || !isSuccess) {
      expectTypeOf(error).toEqualTypeOf<Error | ORPCError<'BAD_GATEWAY', { val: string }>>()
      expectTypeOf(data).toEqualTypeOf<undefined>()
      expectTypeOf(isDefined).toEqualTypeOf<boolean>()

      if (isDefinedError(error)) {
        expectTypeOf(error).toEqualTypeOf<ORPCError<'BAD_GATEWAY', { val: string }>>()
      }

      if (isDefined) {
        expectTypeOf(error).toEqualTypeOf<ORPCError<'BAD_GATEWAY', { val: string }>>()
      }
      else {
        expectTypeOf(error).toEqualTypeOf<Error>()
      }
    }
    else {
      expectTypeOf(error).toEqualTypeOf<null>()
      expectTypeOf(data).toEqualTypeOf<number>()
      expectTypeOf(isDefined).toEqualTypeOf<false>()
    }
  })

  it('object style', async () => {
    const { error, data, isDefined, isSuccess } = await safe(client('123'))

    if (error || !isSuccess) {
      expectTypeOf(error).toEqualTypeOf<Error | ORPCError<'BAD_GATEWAY', { val: string }>>()
      expectTypeOf(data).toEqualTypeOf<undefined>()
      expectTypeOf(isDefined).toEqualTypeOf<boolean>()

      if (isDefinedError(error)) {
        expectTypeOf(error).toEqualTypeOf<ORPCError<'BAD_GATEWAY', { val: string }>>()
      }

      if (isDefined) {
        expectTypeOf(error).toEqualTypeOf<ORPCError<'BAD_GATEWAY', { val: string }>>()
      }
      else {
        expectTypeOf(error).toEqualTypeOf<Error>()
      }
    }
    else {
      expectTypeOf(error).toEqualTypeOf<null>()
      expectTypeOf(data).toEqualTypeOf<number>()
      expectTypeOf(isDefined).toEqualTypeOf<false>()
    }
  })

  it('can catch Promise', async () => {
    const { error, data } = await safe({} as Promise<number>)

    expectTypeOf(error).toEqualTypeOf<Error | null>()
    expectTypeOf(data).toEqualTypeOf<number | undefined>()
  })
})

describe('createSafeClient', async () => {
  const client = {} as {
    ping: Client<ClientContext, string, number, Error | ORPCError<'BAD_GATEWAY', { val: string }>>
    nested: {
      pong: Client<ClientContext, { id: number }, { result: string }, Error>
    }
  }

  it('should transform client to safe client types', async () => {
    const safeClient = createSafeClient(client)

    // Test direct procedure call
    const pingResult = await safeClient.ping('test')
    expectTypeOf(pingResult.error).toEqualTypeOf<Error | ORPCError<'BAD_GATEWAY', { val: string }> | null>()
    expectTypeOf(pingResult.data).toEqualTypeOf<number | undefined>()
    expectTypeOf(pingResult.isDefined).toEqualTypeOf<boolean>()
    expectTypeOf(pingResult.isSuccess).toEqualTypeOf<boolean>()

    // Test nested procedure call
    const pongResult = await safeClient.nested.pong({ id: 123 })
    expectTypeOf(pongResult.error).toEqualTypeOf<Error | null>()
    expectTypeOf(pongResult.data).toEqualTypeOf<{ result: string } | undefined>()
    expectTypeOf(pongResult.isDefined).toEqualTypeOf<boolean>()
    expectTypeOf(pongResult.isSuccess).toEqualTypeOf<boolean>()
  })

  it('should support tuple destructuring', async () => {
    const safeClient = createSafeClient(client)

    const [error, data, isDefined, isSuccess] = await safeClient.ping('test')

    expectTypeOf(error).toEqualTypeOf<Error | ORPCError<'BAD_GATEWAY', { val: string }> | null>()
    expectTypeOf(data).toEqualTypeOf<number | undefined>()
    expectTypeOf(isDefined).toEqualTypeOf<boolean>()
    expectTypeOf(isSuccess).toEqualTypeOf<boolean>()
  })
})
