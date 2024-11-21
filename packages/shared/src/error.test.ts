import { z } from 'zod'
import { ORPCError } from './error'

it('issues', () => {
  const zodError = z.object({ a: z.string() }).safeParse({ a: 1 }).error

  expect(
    new ORPCError({
      code: 'BAD_REQUEST',
      message: 'test',
      cause: zodError,
    }).issues,
  ).toBe(zodError?.issues)

  expect(
    new ORPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'test',
      cause: zodError,
    }).issues,
  ).toBe(undefined)
})
