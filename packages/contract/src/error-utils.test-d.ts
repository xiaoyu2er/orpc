import type { ORPCError } from './error-orpc'
import { isDefinedError } from './error-utils'

it('isDefinedError', () => {
  const orpcError = {} as ORPCError<'CODE', { value: string }> | ORPCError<'BASE', { value: number }>
  const error = {} as Error | typeof orpcError

  if (isDefinedError(error)) {
    expectTypeOf(error).toEqualTypeOf(orpcError)
  }
})
