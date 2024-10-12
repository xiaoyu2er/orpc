import type { SchemaInput } from '@orpc/contract'
import { getPath } from './path'
import type { ProcedureReactClient } from './procedure'
import type { RouterReactClient } from './router'

export type QueryKey = [string[], { input?: unknown; type?: 'infinite' }]

export function getQueryKey<
  TClient extends RouterReactClient | ProcedureReactClient<any, any, any>,
>(
  client: TClient,
  input?: TClient extends ProcedureReactClient<infer UInputSchema, any, any>
    ? SchemaInput<UInputSchema>
    : unknown,
  type?: 'any' | 'infinite',
): QueryKey {
  const path = getPath(client)

  return getQueryKeyFromPath(path, input, type)
}

export function getQueryKeyFromPath(
  path: string[],
  input?: unknown,
  type?: 'any' | 'infinite',
): QueryKey {
  const withInput = input !== undefined ? { input } : {}
  const withType = type && type !== 'any' ? { type } : {}

  return [
    path,
    {
      ...withInput,
      ...withType,
    },
  ]
}
