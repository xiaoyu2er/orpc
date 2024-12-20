import type { ProcedureClient } from '@orpc/server'
import { createProcedureFetchClient } from './procedure-fetch-client'

describe('procedure fetch client', () => {
  it('just a client', () => {
    const client = createProcedureFetchClient<string, number>({
      baseURL: 'http://localhost:3000/orpc',
      path: ['ping'],
    })

    expectTypeOf(client).toEqualTypeOf<ProcedureClient<string, number>>()
  })
})
