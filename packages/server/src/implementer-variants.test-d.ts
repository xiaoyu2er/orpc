import type { router } from '../../contract/tests/helpers'
import type { InitialContext } from '../tests/shared'
import type { ImplementerInternal } from './implementer'
import type { ImplementerInternalWithMiddlewares } from './implementer-variants'

describe('ImplementerWithMiddlewares', () => {
  it('backwards compatibility with Implementer', () => {
    const implementer: ImplementerInternalWithMiddlewares<typeof router, InitialContext, InitialContext>
        = {} as ImplementerInternal<typeof router, InitialContext>
  })
})
