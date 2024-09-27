import { ContractRoute } from '@orpc/contract'
import { describe } from 'node:test'
import { expectTypeOf, it } from 'vitest'
import { z } from 'zod'
import { createServerRouteBuilder } from './route-builder'

describe('output schema', () => {
  it('auto infer output schema if output schema is not specified', async () => {
    const srb1 = createServerRouteBuilder(new ContractRoute({}))

    const sr = srb1.handler(() => ({ a: 1 }))

    const result = await sr.__sr.handler({}, {}, { method: 'GET', path: '/' })

    expectTypeOf(result).toEqualTypeOf<{ a: number }>()
  })

  it('not infer output schema if output schema is not specified', async () => {
    const srb1 = createServerRouteBuilder(
      new ContractRoute({
        OutputSchema: z.unknown(),
      })
    )

    const sr = srb1.handler(() => ({ b: 1 }))

    const result = await sr.__sr.handler({}, {}, { method: 'GET', path: '/' })

    expectTypeOf(result).toEqualTypeOf<unknown>()
  })
})
