import type { ANY_CONTRACT_PROCEDURE } from './procedure'
import { isContractProcedure } from './procedure'

describe('isContractProcedure', () => {
  it('works', () => {
    const procedure = {} as unknown

    if (isContractProcedure(procedure)) {
      expectTypeOf(procedure).toEqualTypeOf<ANY_CONTRACT_PROCEDURE>()
    }
  })
})
