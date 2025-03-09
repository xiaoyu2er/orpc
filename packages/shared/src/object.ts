export type Segment = string | number

export function findDeepMatches(
  check: (value: unknown) => boolean,
  payload: unknown,
  segments: Segment[] = [],
  maps: Segment[][] = [],
  values: unknown[] = [],
): { maps: Segment[][], values: unknown[] } {
  if (check(payload)) {
    maps.push(segments)
    values.push(payload)
  }
  else if (Array.isArray(payload)) {
    payload.forEach((v, i) => {
      findDeepMatches(check, v, [...segments, i], maps, values)
    })
  }
  else if (isObject(payload)) {
    for (const key in payload) {
      findDeepMatches(check, payload[key], [...segments, key], maps, values)
    }
  }

  return { maps, values }
}

/**
 * Check if the value is an object even it created by `Object.create(null)` or more tricky way.
 */
export function isObject(value: unknown): value is Record<PropertyKey, unknown> {
  if (!value || typeof value !== 'object') {
    return false
  }

  const proto = Object.getPrototypeOf(value)

  return proto === Object.prototype || !proto || !proto.constructor
}

/**
 * Check if the value satisfy a `object` type in typescript
 */
export function isTypescriptObject(value: unknown): value is object & Record<PropertyKey, unknown> {
  return !!value && (typeof value === 'object' || typeof value === 'function')
}

export function clone<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(clone) as any
  }

  if (isObject(value)) {
    const result: Record<PropertyKey, unknown> = {}

    for (const key in value) {
      result[key] = clone(value[key])
    }

    return result as any
  }

  return value
}
