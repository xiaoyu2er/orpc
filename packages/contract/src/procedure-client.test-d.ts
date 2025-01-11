import type { Client } from './client'
import type { ORPCError } from './error-orpc'
import type { ContractProcedureClient } from './procedure-client'
import { z } from 'zod'

const schema = z.object({
  value: z.string().transform(() => 1),
})
const baseErrors = {
  CODE: {
    data: z.object({
      why: z.string(),
    }),
  },
}

describe('ContractProcedureClient', () => {
  it('compatible with Client', () => {
    expectTypeOf<
      ContractProcedureClient<'context', typeof schema, typeof schema, typeof baseErrors>
    >().toEqualTypeOf<Client<'context', { value: string }, { value: number }, Error | ORPCError<'CODE', { why: string }>>>()

    expectTypeOf<
      ContractProcedureClient<'context', typeof schema, typeof schema, typeof baseErrors>
    >().not.toEqualTypeOf<Client<'diff', { value: string }, { value: number }, Error | ORPCError<'CODE', { why: string }>>>()

    expectTypeOf<
      ContractProcedureClient<'context', typeof schema, typeof schema, typeof baseErrors>
    >().not.toEqualTypeOf<Client<'context', { value: number }, { value: number }, Error | ORPCError<'CODE', { why: string }>>>()
  })
})
