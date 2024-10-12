import type { ProcedureReactClient } from './procedure'
import type { RouterReactClient } from './router'

export const pathSymbol = Symbol('routerPath')

export function getPath(
  client: RouterReactClient | ProcedureReactClient<any, any, any>,
): string[] {
  try {
    return (client as any)[pathSymbol] ?? []
  } catch {
    return []
  }
}
