import type { EntryKey } from '@pinia/colada'
import { SuperJSON } from '@orpc/server/fetch'

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
    ...options?.input !== undefined ? [{ input: JSON.stringify(SuperJSON.serialize(options.input)) }] : [],
  ]
}
