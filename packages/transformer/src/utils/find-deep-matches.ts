import { isPlainObject } from 'is-what'

export function findDeepMatches(
  check: (value: unknown) => boolean,
  payload: unknown,
  path?: string[],
): { maps: string[][]; values: unknown[] } {
  const path_ = path ?? []

  if (check(payload)) {
    return { maps: [path_], values: [payload] }
  }

  const maps: string[][] = []
  const values: unknown[] = []

  if (Array.isArray(payload) || isPlainObject(payload)) {
    for (const key in payload) {
      const r = findDeepMatches(check, payload[key], [...path_, key])
      maps.push(...r.maps)
      values.push(...r.values)
    }
  }

  return { maps, values }
}
