import { isPlainObject } from 'is-what'
import type { Segment } from '../utils/object'

export type JSONExtraType =
  | 'bigint'
  | 'date'
  | 'nan'
  | 'undefined'
  | 'set'
  | 'map'
  | 'regexp'
  | 'url'

export type JSONMeta = [JSONExtraType, Segment[]][]

export function serialize(
  value: unknown,
  segments: Segment[] = [],
  meta: JSONMeta = [],
): {
  data: unknown
  meta: JSONMeta
} {
  if (typeof value === 'bigint') {
    meta.push(['bigint', segments])
    return { data: value.toString(), meta }
  }

  if (value instanceof Date) {
    meta.push(['date', segments])
    const data = Number.isNaN(value.getTime())
      ? 'Invalid Date'
      : value.toISOString()
    return { data, meta }
  }

  if (Number.isNaN(value)) {
    meta.push(['nan', segments])
    return { data: 'NaN', meta }
  }

  if (value instanceof RegExp) {
    meta.push(['regexp', segments])
    return { data: value.toString(), meta }
  }

  if (value instanceof URL) {
    meta.push(['url', segments])
    return { data: value.toString(), meta }
  }

  if (isPlainObject(value)) {
    const data: Record<string, unknown> = {}

    for (const k in value) {
      data[k] = serialize(value[k], [...segments, k], meta).data
    }

    return { data, meta }
  }

  if (Array.isArray(value)) {
    const data = value.map((v, i) => {
      if (v === undefined) {
        meta.push(['undefined', [...segments, i]])
        return null
      }

      return serialize(v, [...segments, i], meta).data
    })

    return { data, meta }
  }

  if (value instanceof Set) {
    const result = serialize(Array.from(value), segments, meta)
    meta.push(['set', segments])
    return result
  }

  if (value instanceof Map) {
    const result = serialize(Array.from(value.entries()), segments, meta)
    meta.push(['map', segments])
    return result
  }

  return { data: value, meta }
}

export function deserialize({
  data,
  meta,
}: {
  data: unknown
  meta: JSONMeta
}): unknown {
  if (meta.length === 0) {
    return data
  }

  const ref = { data }

  for (const [type, segments] of meta) {
    let currentRef: any = ref
    let preSegment: string | number = 'data'

    for (let i = 0; i < segments.length; i++) {
      currentRef = currentRef[preSegment]
      preSegment = segments[i]!
    }

    switch (type) {
      case 'nan':
        currentRef[preSegment] = Number.NaN
        break

      case 'bigint':
        currentRef[preSegment] = BigInt(currentRef[preSegment])
        break

      case 'date':
        currentRef[preSegment] = new Date(currentRef[preSegment])
        break

      case 'regexp': {
        const match = currentRef[preSegment].match(/^\/(.*)\/([a-z]*)$/)

        if (match) {
          const [, pattern, flags] = match
          currentRef[preSegment] = new RegExp(pattern!, flags)
        } else {
          currentRef[preSegment] = new RegExp(currentRef[preSegment])
        }

        break
      }

      case 'url':
        currentRef[preSegment] = new URL(currentRef[preSegment])
        break

      case 'undefined':
        currentRef[preSegment] = undefined
        break

      case 'map':
        currentRef[preSegment] = new Map(currentRef[preSegment])
        break

      case 'set':
        currentRef[preSegment] = new Set(currentRef[preSegment])
        break

      default: {
        const _expected: never = type
      }
    }
  }

  return ref.data
}
