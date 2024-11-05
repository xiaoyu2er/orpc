import { isPlainObject } from 'is-what'

type Segment = string | number

export function findDeepMatches(
  check: (value: unknown) => boolean,
  payload: unknown,
  segments: Segment[] = [],
  maps: Segment[][] = [],
  values: unknown[] = [],
): { maps: Segment[][]; values: unknown[] } {
  if (check(payload)) {
    maps.push(segments)
    values.push(payload)
  } else if (Array.isArray(payload)) {
    payload.forEach((v, i) => {
      findDeepMatches(check, v, [...segments, i], maps, values)
    })
  } else if (isPlainObject(payload)) {
    for (const key in payload) {
      findDeepMatches(check, payload[key], [...segments, key], maps, values)
    }
  }

  return { maps, values }
}
