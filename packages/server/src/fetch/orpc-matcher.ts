import type { ANY_PROCEDURE } from '../procedure'
import { trim } from '@orpc/shared'
import { unlazy } from '../lazy'
import { isProcedure } from '../procedure'
import { type ANY_ROUTER, getRouterChild } from '../router'

export class ORPCMatcher {
  constructor(
    private readonly router: ANY_ROUTER,
  ) {}

  async match(pathname: string): Promise<{ path: string[], procedure: ANY_PROCEDURE } | undefined> {
    const path = trim(pathname, '/').split('/').map(decodeURIComponent)

    const match = getRouterChild(this.router, ...path)
    const { default: maybeProcedure } = await unlazy(match)

    if (!isProcedure(maybeProcedure)) {
      return undefined
    }

    return {
      procedure: maybeProcedure,
      path,
    }
  }
}
