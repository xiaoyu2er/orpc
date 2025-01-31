import type { AnyProcedure } from '../../procedure'
import type { AnyRouter } from '../../router'
import { trim } from '@orpc/shared'
import { unlazy } from '../../lazy'
import { isProcedure } from '../../procedure'
import { getRouterChild } from '../../router'

export class ORPCProcedureMatcher {
  constructor(
    private readonly router: AnyRouter,
  ) { }

  async match(pathname: string): Promise<{ path: string[], procedure: AnyProcedure } | undefined> {
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

export type PublicORPCProcedureMatcher = Pick<ORPCProcedureMatcher, keyof ORPCProcedureMatcher>
