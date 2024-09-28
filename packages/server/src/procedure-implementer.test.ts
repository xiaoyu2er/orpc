import { ContractProcedure } from '@orpc/contract'
import { describe } from 'node:test'
import { expectTypeOf, it } from 'vitest'
import { z } from 'zod'
import { ProcedureImplementer } from './procedure-implementer'

describe('output schema', () => {
  it('auto infer output schema if output schema is not specified', async () => {
    const srb1 = new ProcedureImplementer({ contract: new ContractProcedure({}) })

    const sr = srb1.handler(() => ({ a: 1 }))

    const result = await sr.__p.handler({}, {}, { method: 'GET', path: '/' })

    expectTypeOf(result).toEqualTypeOf<{ a: number }>()
  })

  it('not infer output schema if output schema is not specified', async () => {
    const srb1 = new ProcedureImplementer({
      contract: new ContractProcedure({
        OutputSchema: z.unknown(),
      }),
    })

    const sr = srb1.handler(() => ({ b: 1 }))

    const result = await sr.__p.handler({}, {}, { method: 'GET', path: '/' })

    expectTypeOf(result).toEqualTypeOf<unknown>()
  })
})
