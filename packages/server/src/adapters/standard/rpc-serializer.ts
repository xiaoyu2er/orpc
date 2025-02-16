import type { JsonValue } from '@orpc/server-standard'
import type { Segment } from '@orpc/shared'
import { mapEventIterator, ORPCError, toORPCError } from '@orpc/contract'
import { ErrorEvent, isAsyncIteratorObject } from '@orpc/server-standard'
import { findDeepMatches, isObject, set } from '@orpc/shared'

export type RPCSerializedJsonMeta = ['bigint' | 'date' | 'nan' | 'undefined' | 'set' | 'map' | 'regexp' | 'url', Segment[]][]
export type RPCSerialized =
  | { json: unknown, meta: RPCSerializedJsonMeta }
  | FormData
  | AsyncIteratorObject<{ json: unknown, meta: RPCSerializedJsonMeta }, { json: unknown, meta: RPCSerializedJsonMeta }, void>

export type RPCSerializedFormDataMaps = Segment[][]

export class RPCSerializer {
  serialize(data: unknown): RPCSerialized {
    if (isAsyncIteratorObject(data)) {
      return mapEventIterator(data, {
        value: async (value: unknown) => serializeRPCJson(value),
        error: async (e) => {
          if (e instanceof ErrorEvent) {
            return new ErrorEvent({
              data: serializeRPCJson(e.data) as JsonValue,
              cause: e,
            })
          }

          return new ErrorEvent({
            data: serializeRPCJson(toORPCError(e).toJSON()) as JsonValue,
            cause: e,
          })
        },
      })
    }

    const serializedJSON = serializeRPCJson(data)
    const { maps, values: blobs } = findDeepMatches(v => v instanceof Blob, serializedJSON.json)

    if (blobs.length === 0) {
      return serializedJSON
    }

    const form = new FormData()

    form.set('data', JSON.stringify(serializedJSON))
    form.set('maps', JSON.stringify(maps))

    for (const i in blobs) {
      form.set(i, blobs[i]! as Blob)
    }

    return form
  }

  deserialize(serialized: RPCSerialized): unknown {
    if (isAsyncIteratorObject(serialized)) {
      return mapEventIterator(serialized, {
        value: async value => deserializeRPCJson(value),
        error: async (e) => {
          if (!(e instanceof ErrorEvent)) {
            return e
          }

          const deserialized = deserializeRPCJson(e.data as any)

          if (ORPCError.isValidJSON(deserialized)) {
            return ORPCError.fromJSON(deserialized, { cause: e })
          }

          return new ErrorEvent({
            data: deserialized as JsonValue,
            cause: e,
          })
        },
      })
    }

    if (!(serialized instanceof FormData)) {
      return deserializeRPCJson(serialized)
    }

    const data = JSON.parse(serialized.get('data') as string) as { json: unknown, meta: RPCSerializedJsonMeta }
    const maps = JSON.parse(serialized.get('maps') as string) as RPCSerializedFormDataMaps

    for (const i in maps) {
      data.json = set(data.json, maps[i]!, serialized.get(i))
    }

    return deserializeRPCJson(data)
  }
}

export function serializeRPCJson(
  value: unknown,
  segments: Segment[] = [],
  meta: RPCSerializedJsonMeta = [],
): {
    json: unknown
    meta: RPCSerializedJsonMeta
  } {
  if (typeof value === 'bigint') {
    meta.push(['bigint', segments])
    return { json: value.toString(), meta }
  }

  if (value instanceof Date) {
    meta.push(['date', segments])
    const data = Number.isNaN(value.getTime())
      ? 'Invalid Date'
      : value.toISOString()
    return { json: data, meta }
  }

  if (Number.isNaN(value)) {
    meta.push(['nan', segments])
    return { json: 'NaN', meta }
  }

  if (value instanceof RegExp) {
    meta.push(['regexp', segments])
    return { json: value.toString(), meta }
  }

  if (value instanceof URL) {
    meta.push(['url', segments])
    return { json: value.toString(), meta }
  }

  if (isObject(value)) {
    const json: Record<string, unknown> = {}

    for (const k in value) {
      json[k] = serializeRPCJson(value[k], [...segments, k], meta).json
    }

    return { json, meta }
  }

  if (Array.isArray(value)) {
    const json = value.map((v, i) => {
      if (v === undefined) {
        meta.push(['undefined', [...segments, i]])
        return null
      }

      return serializeRPCJson(v, [...segments, i], meta).json
    })

    return { json, meta }
  }

  if (value instanceof Set) {
    const result = serializeRPCJson(Array.from(value), segments, meta)
    meta.push(['set', segments])
    return result
  }

  if (value instanceof Map) {
    const result = serializeRPCJson(Array.from(value.entries()), segments, meta)
    meta.push(['map', segments])
    return result
  }

  return { json: value, meta }
}

function deserializeRPCJson({
  json,
  meta,
}: {
  json: unknown
  meta: RPCSerializedJsonMeta
}): unknown {
  if (meta.length === 0) {
    return json
  }

  const ref = { data: json }

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
        const [, pattern, flags] = currentRef[preSegment].match(/^\/(.*)\/([a-z]*)$/)

        currentRef[preSegment] = new RegExp(pattern!, flags)

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

      /* v8 ignore next 3 */
      default: {
        const _expected: never = type
      }
    }
  }

  return ref.data
}
