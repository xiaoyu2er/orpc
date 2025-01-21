import type { ContractBuilder } from '.'
import type { Meta } from './meta'
import type { StrictRoute } from './route-utils'
import { oc } from '.'

it('oc should be strict', () => {
  expectTypeOf(oc).toMatchTypeOf<ContractBuilder<
    StrictRoute<Record<never, never>>,
    Meta,
    Record<never, never>
  >>()
})
