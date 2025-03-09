import type { baseErrorMap, BaseMeta, inputSchema, outputSchema, ping, pong, router } from '../tests/shared'
import type { MergedErrorMap } from './error'
import type { Lazy } from './lazy'
import type { Meta } from './meta'
import type { ContractProcedure } from './procedure'
import type { AccessibleLazyContractRouter, EnhancedContractRouter } from './router-utils'

it('AccessibleLazyContractRouter', () => {
  const accessible = {} as AccessibleLazyContractRouter<Lazy<typeof router>>

  expectTypeOf(accessible.ping).toEqualTypeOf<Lazy<typeof ping>>()
  expectTypeOf(accessible.pong).toEqualTypeOf<Lazy<typeof pong>>()
  expectTypeOf(accessible.nested.ping).toEqualTypeOf<Lazy<typeof ping>>()
  expectTypeOf(accessible.nested.pong).toEqualTypeOf<Lazy<typeof pong>>()
})

it('EnhancedContractRouter', () => {
  const enhanced = {} as EnhancedContractRouter<typeof router, { INVALID: { status: number }, BASE2: { message: string } }>

  expectTypeOf(enhanced.ping).toEqualTypeOf<
    Lazy<ContractProcedure<
        typeof inputSchema,
        typeof outputSchema,
        MergedErrorMap<{ INVALID: { status: number }, BASE2: { message: string } }, typeof baseErrorMap>,
        BaseMeta
    >>
  >()

  expectTypeOf(enhanced.nested.ping).toEqualTypeOf<
    Lazy<ContractProcedure<
        typeof inputSchema,
        typeof outputSchema,
        MergedErrorMap<{ INVALID: { status: number }, BASE2: { message: string } }, typeof baseErrorMap>,
        BaseMeta
    >>
  >()

  expectTypeOf(enhanced.pong).toEqualTypeOf<
    ContractProcedure<
      undefined,
      undefined,
      MergedErrorMap<{ INVALID: { status: number }, BASE2: { message: string } }, Record<never, never>>,
      Meta
    >
  >()

  expectTypeOf(enhanced.nested.pong).toEqualTypeOf<
    Lazy<ContractProcedure<
      undefined,
      undefined,
      MergedErrorMap<{ INVALID: { status: number }, BASE2: { message: string } }, Record<never, never>>,
      Meta
    >>
  >()
})
