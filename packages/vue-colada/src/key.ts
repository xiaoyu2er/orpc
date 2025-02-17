import type { EntryKey } from '@pinia/colada'
import { serializeRPCJson } from '@orpc/client/rpc'

export interface BuildKeyOptions<TInput> {
  input?: TInput
}

export function buildKey<TInput>(
  path: string[],
  options?: BuildKeyOptions<TInput>,
): EntryKey {
  return [
    ...path,
    ...options?.input !== undefined ? [{ input: JSON.stringify(serializeRPCJson(options.input)) }] : [],
  ]
}
