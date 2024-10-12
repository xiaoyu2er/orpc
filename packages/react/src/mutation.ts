import { getPath } from './path'
import type { ProcedureReactClient } from './procedure'
import type { RouterReactClient } from './router'

export type MutationKey = [string[]]

export function getMutationKey(
  client: RouterReactClient | ProcedureReactClient<any, any, any>,
): MutationKey {
  const path = getPath(client)

  return getMutationKeyFromPath(path)
}

export function getMutationKeyFromPath(path: string[]): MutationKey {
  return [path]
}
