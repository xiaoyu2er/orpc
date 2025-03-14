import { isObject, type Segment } from '@orpc/shared'

export const STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES = {
  BIGINT: 0,
  DATE: 1,
  NAN: 2,
  UNDEFINED: 3,
  URL: 4,
  REGEXP: 5,
  SET: 6,
  MAP: 7,
} as const

export type StandardRPCJsonSerializedMeta = [number, Segment[]][]
export type StandardRPCJsonSerialized = [json: unknown, meta: StandardRPCJsonSerializedMeta, maps: Segment[][], blobs: Blob[]]

export interface StandardRPCJsonCustomSerializer {
  type: number
  condition(data: unknown): boolean
  serialize(data: any): unknown
  deserialize(serialized: any): unknown
}

export interface StandardRPCJsonSerializerOptions {
  customJsonSerializers?: readonly StandardRPCJsonCustomSerializer[]
}

export class StandardRPCJsonSerializer {
  private readonly customSerializers: readonly StandardRPCJsonCustomSerializer[]

  constructor(options: StandardRPCJsonSerializerOptions = {}) {
    this.customSerializers = options.customJsonSerializers ?? []

    if (this.customSerializers.length !== new Set(this.customSerializers.map(custom => custom.type)).size) {
      throw new Error('Custom serializer type must be unique.')
    }
  }

  serialize(data: unknown, segments: Segment[] = [], meta: StandardRPCJsonSerializedMeta = [], maps: Segment[][] = [], blobs: Blob[] = []): StandardRPCJsonSerialized {
    for (const custom of this.customSerializers) {
      if (custom.condition(data)) {
        const result = this.serialize(custom.serialize(data), segments, meta, maps, blobs)

        meta.push([custom.type, segments])

        return result
      }
    }

    if (data instanceof Blob) {
      maps.push(segments)
      blobs.push(data)
      return [data, meta, maps, blobs]
    }

    if (typeof data === 'bigint') {
      meta.push([STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.BIGINT, segments])
      return [data.toString(), meta, maps, blobs]
    }

    if (data instanceof Date) {
      meta.push([STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.DATE, segments])

      if (Number.isNaN(data.getTime())) {
        return [null, meta, maps, blobs]
      }

      return [data.toISOString(), meta, maps, blobs]
    }

    if (Number.isNaN(data)) {
      meta.push([STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.NAN, segments])
      return [null, meta, maps, blobs]
    }

    if (data instanceof URL) {
      meta.push([STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.URL, segments])
      return [data.toString(), meta, maps, blobs]
    }

    if (data instanceof RegExp) {
      meta.push([STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.REGEXP, segments])
      return [data.toString(), meta, maps, blobs]
    }

    if (data instanceof Set) {
      const result = this.serialize(Array.from(data), segments, meta, maps, blobs)
      meta.push([STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.SET, segments])
      return result
    }

    if (data instanceof Map) {
      const result = this.serialize(Array.from(data.entries()), segments, meta, maps, blobs)
      meta.push([STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.MAP, segments])
      return result
    }

    if (Array.isArray(data)) {
      const json = data.map((v, i) => {
        if (v === undefined) {
          meta.push([STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.UNDEFINED, [...segments, i]])
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

      for (const custom of this.customSerializers) {
        if (custom.type === type) {
          currentRef[preSegment] = custom.deserialize(currentRef[preSegment])

          break
        }
      }

      switch (type) {
        case STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.BIGINT:
          currentRef[preSegment] = BigInt(currentRef[preSegment])
          break

        case STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.DATE:
          currentRef[preSegment] = new Date(currentRef[preSegment] ?? 'Invalid Date')
          break

        case STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.NAN:
          currentRef[preSegment] = Number.NaN
          break

        case STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.UNDEFINED:
          currentRef[preSegment] = undefined
          break

        case STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.URL:
          currentRef[preSegment] = new URL(currentRef[preSegment])
          break

        case STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.REGEXP: {
          const [, pattern, flags] = currentRef[preSegment].match(/^\/(.*)\/([a-z]*)$/)

          currentRef[preSegment] = new RegExp(pattern!, flags)

          break
        }

        case STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.SET:
          currentRef[preSegment] = new Set(currentRef[preSegment])
          break

        case STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.MAP:
          currentRef[preSegment] = new Map(currentRef[preSegment])
          break
      }
    }

    return ref.data
  }
}
