import { isObject, type Segment } from '@orpc/shared'

const TYPE_BIGINT = 0
const TYPE_DATE = 1
const TYPE_NAN = 2
const TYPE_UNDEFINED = 3
const TYPE_URL = 4
const TYPE_REGEXP = 5
const TYPE_SET = 6
const TYPE_MAP = 7

export type StandardRPCJsonSerializedMeta = [number, Segment[]][]
export type StandardRPCJsonSerialized = [json: unknown, meta: StandardRPCJsonSerializedMeta, maps: Segment[][], blobs: Blob[]]

export interface StandardRPCJsonSerializerOptions {

}

export class StandardRPCJsonSerializer {
  constructor(_options: StandardRPCJsonSerializerOptions = {}) {}

  serialize(data: unknown, segments: Segment[] = [], meta: StandardRPCJsonSerializedMeta = [], maps: Segment[][] = [], blobs: Blob[] = []): StandardRPCJsonSerialized {
    if (data instanceof Blob) {
      maps.push(segments)
      blobs.push(data)
      return [data, meta, maps, blobs]
    }

    if (typeof data === 'bigint') {
      meta.push([TYPE_BIGINT, segments])
      return [data.toString(), meta, maps, blobs]
    }

    if (data instanceof Date) {
      meta.push([TYPE_DATE, segments])

      if (Number.isNaN(data.getTime())) {
        return [null, meta, maps, blobs]
      }

      return [data.toISOString(), meta, maps, blobs]
    }

    if (Number.isNaN(data)) {
      meta.push([TYPE_NAN, segments])
      return [null, meta, maps, blobs]
    }

    if (data instanceof URL) {
      meta.push([TYPE_URL, segments])
      return [data.toString(), meta, maps, blobs]
    }

    if (data instanceof RegExp) {
      meta.push([TYPE_REGEXP, segments])
      return [data.toString(), meta, maps, blobs]
    }

    if (data instanceof Set) {
      const result = this.serialize(Array.from(data), segments, meta, maps, blobs)
      meta.push([TYPE_SET, segments])
      return result
    }

    if (data instanceof Map) {
      const result = this.serialize(Array.from(data.entries()), segments, meta, maps, blobs)
      meta.push([TYPE_MAP, segments])
      return result
    }

    if (Array.isArray(data)) {
      const json = data.map((v, i) => {
        if (v === undefined) {
          meta.push([TYPE_UNDEFINED, [...segments, i]])
          return v
        }

        return this.serialize(v, [...segments, i], meta, maps, blobs)[0]
      })

      return [json, meta, maps, blobs]
    }

    if (isObject(data)) {
      const json: Record<string, unknown> = {}

      for (const k in data) {
        json[k] = this.serialize(data[k], [...segments, k], meta, maps, blobs)[0]
      }

      return [json, meta, maps, blobs]
    }

    return [data, meta, maps, blobs]
  }

  deserialize(json: unknown, meta: StandardRPCJsonSerializedMeta): unknown
  deserialize(json: unknown, meta: StandardRPCJsonSerializedMeta, maps: Segment[][], getBlob: (index: number) => Blob): unknown

  deserialize(json: unknown, meta: StandardRPCJsonSerializedMeta, maps?: Segment[][], getBlob?: (index: number) => Blob): unknown {
    const ref = { data: json }

    if (maps && getBlob) {
      maps.forEach((segments, i) => {
        let currentRef: any = ref
        let preSegment: string | number = 'data'

        segments.forEach((segment) => {
          currentRef = currentRef[preSegment]
          preSegment = segment
        })

        currentRef[preSegment] = getBlob(i)
      })
    }

    for (const [type, segments] of meta) {
      let currentRef: any = ref
      let preSegment: string | number = 'data'

      segments.forEach((segment) => {
        currentRef = currentRef[preSegment]
        preSegment = segment
      })

      switch (type) {
        case TYPE_BIGINT:
          currentRef[preSegment] = BigInt(currentRef[preSegment])
          break

        case TYPE_DATE:
          currentRef[preSegment] = new Date(currentRef[preSegment] ?? 'Invalid Date')
          break

        case TYPE_NAN:
          currentRef[preSegment] = Number.NaN
          break

        case TYPE_UNDEFINED:
          currentRef[preSegment] = undefined
          break

        case TYPE_URL:
          currentRef[preSegment] = new URL(currentRef[preSegment])
          break

        case TYPE_REGEXP: {
          const [, pattern, flags] = currentRef[preSegment].match(/^\/(.*)\/([a-z]*)$/)

          currentRef[preSegment] = new RegExp(pattern!, flags)

          break
        }

        case TYPE_SET:
          currentRef[preSegment] = new Set(currentRef[preSegment])
          break

        case TYPE_MAP:
          currentRef[preSegment] = new Map(currentRef[preSegment])
          break
      }
    }

    return ref.data
  }
}
