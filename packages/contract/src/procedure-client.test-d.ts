import type { Client } from '@orpc/client'
import type { baseErrorMap, inputSchema, outputSchema } from '../tests/shared'
import type { ErrorFromErrorMap } from './error'
import type { ContractProcedureClient } from './procedure-client'

describe('ContractProcedureClient', () => {
  it('is a client', () => {
    expectTypeOf<
      ContractProcedureClient<{ cache?: boolean }, typeof inputSchema, typeof outputSchema, typeof baseErrorMap>
    >().toEqualTypeOf<
      Client<
        { cache?: boolean },
        { input: number },
        { output: string },
        ErrorFromErrorMap<typeof baseErrorMap>
      >
    >()
  })
})
