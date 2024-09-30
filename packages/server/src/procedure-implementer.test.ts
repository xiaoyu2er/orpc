import { ContractProcedure } from '@orpc/contract'
import { describe } from 'node:test'
import { expectTypeOf, it } from 'vitest'
import { z } from 'zod'
import { initORPC } from '.'
import { ProcedureImplementer } from './procedure-implementer'

describe('output schema', () => {
  it('auto infer output schema if output schema is not specified', async () => {
    const sr = initORPC.handler(() => ({ a: 1 }))

    const result = await sr.__p.handler({}, undefined, { method: 'GET', path: '/' } as any)

    expectTypeOf(result).toEqualTypeOf<{ a: number }>()
  })

  it('not infer output schema if output schema is not specified', async () => {
    const srb1 = new ProcedureImplementer({
      contract: new ContractProcedure({
        OutputSchema: z.unknown(),
      }),
    })

    const sr = srb1.handler(() => ({ b: 1 }))

    const result = await sr.__p.handler({}, {}, { method: 'GET', path: '/' } as any)

    expectTypeOf(result).toEqualTypeOf<unknown>()
  })
})
