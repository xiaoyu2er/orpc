import type { Caller } from '@orpc/server'
import { createProcedureClient } from './procedure'

describe('procedure client', () => {
  it('just a caller', () => {
    const client = createProcedureClient<string, number>({
      baseURL: 'http://localhost:3000/orpc',
      path: ['ping'],
    })

    expectTypeOf(client).toEqualTypeOf<Caller<string, number>>()
  })
})
