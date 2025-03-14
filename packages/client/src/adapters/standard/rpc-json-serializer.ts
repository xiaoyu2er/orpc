import { isObject, type Segment } from '@orpc/shared'

export type RPCJsonSerializedMeta = [
  | 0 // bigint
  | 1 // date
  | 2 // nan
  | 3 // undefined
  | 4 // url
  | 5 // regexp
  | 6 // set
  | 7 // map
  , Segment[],
][]
export type RPCJsonSerialized = [json: unknown, meta: RPCJsonSerializedMeta, maps: Segment[][], blobs: Blob[]]

export interface RPCJsonSerializerOptions {

}

export class RPCJsonSerializer {
  constructor(options: RPCJsonSerializerOptions = {}) {}

  serialize(data: unknown, segments: Segment[] = [], meta: RPCJsonSerializedMeta = [], maps: Segment[][] = [], blobs: Blob[] = []): RPCJsonSerialized {
    if (data instanceof Blob) {
      maps.push(segments)
      blobs.push(data)
      return [data, meta, maps, blobs]
    }

    if (typeof data === 'bigint') {
      meta.push([0, segments])
      return [data.toString(), meta, maps, blobs]
    }

    if (data instanceof Date) {
      meta.push([1, segments])

      if (Number.isNaN(data.getTime())) {
        return [null, meta, maps, blobs]
      }

      return [data.toISOString(), meta, maps, blobs]
    }

    if (Number.isNaN(data)) {
      meta.push([2, segments])
      return [null, meta, maps, blobs]
    }

    if (data instanceof URL) {
      meta.push([4, segments])
      return [data.toString(), meta, maps, blobs]
    }

    if (data instanceof RegExp) {
      meta.push([5, segments])
      return [data.toString(), meta, maps, blobs]
    }

    if (data instanceof Set) {
      const result = this.serialize(Array.from(data), segments, meta, maps, blobs)
      meta.push([6, segments])
      return result
    }

    if (data instanceof Map) {
      const result = this.serialize(Array.from(data.entries()), segments, meta, maps, blobs)
      meta.push([7, segments])
      return result
    }

    if (Array.isArray(data)) {
      const json = data.map((v, i) => {
        if (v === undefined) {
          meta.push([3, [...segments, i]])
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

  deserialize(json: unknown, meta: RPCJsonSerializedMeta): unknown
  deserialize(json: unknown, meta: RPCJsonSerializedMeta, maps: Segment[][], getBlob: (index: number) => Blob): unknown

  deserialize(json: unknown, meta: RPCJsonSerializedMeta, maps?: Segment[][], getBlob?: (index: number) => Blob): unknown {
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
        case 0:
          currentRef[preSegment] = BigInt(currentRef[preSegment])
          break

        case 1:
          currentRef[preSegment] = new Date(currentRef[preSegment] ?? 'Invalid Date')
          break

        case 2:
          currentRef[preSegment] = Number.NaN
          break

        case 3:
          currentRef[preSegment] = undefined
          break

        case 4:
          currentRef[preSegment] = new URL(currentRef[preSegment])
          break

        case 5: {
          const [, pattern, flags] = currentRef[preSegment].match(/^\/(.*)\/([a-z]*)$/)

          currentRef[preSegment] = new RegExp(pattern!, flags)

          break
        }

        case 6:
          currentRef[preSegment] = new Set(currentRef[preSegment])
          break

        case 7:
          currentRef[preSegment] = new Map(currentRef[preSegment])
          break

        /* v8 ignore next 3 */
        default: {
          const _expected: never = type
        }
      }
    }

    return ref.data
  }
}
