import type { ProcedureHooks } from './procedure-hooks'
import type { ORPCHooks } from './react-hooks'

export const orpcPathSymbol = Symbol('orpcPathSymbol')

export function getORPCPath(
  orpc:
    | ORPCHooks<any>
    | ProcedureHooks<any, any>,
): string[] {
  const val = Reflect.get(orpc, orpcPathSymbol)

  if (!Array.isArray(val)) {
    throw new TypeError(
      'orpcPathSymbol is not implemented, please use getORPCPath with correct instance.',
    )
  }

  return val
}
