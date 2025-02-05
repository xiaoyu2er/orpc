import type { EntryKey } from '@pinia/colada'
import { serializeRPCJson } from '@orpc/server/standard'

export interface BuildKeyOptions<TInput> {
  input?: TInput
}

export function buildKey<TInput>(
  path: string[],
  options?: BuildKeyOptions<TInput>,
): EntryKey {
  return [
    '__ORPC__',
    ...path,
    ...options?.input !== undefined ? [{ input: JSON.stringify(serializeRPCJson(options.input)) }] : [],
  ]
}
