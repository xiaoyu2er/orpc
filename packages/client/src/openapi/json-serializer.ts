import { isObject } from '@orpc/shared'

export type OpenAPIJsonSerialized = [json: unknown, hasBlob: boolean]

export class OpenAPIJsonSerializer {
  serialize(data: unknown, hasBlobRef: { value: boolean } = { value: false }): OpenAPIJsonSerialized {
    if (data instanceof Blob) {
      hasBlobRef.value = true
      return [data, hasBlobRef.value]
    }

    if (data instanceof Set) {
      return this.serialize(Array.from(data), hasBlobRef)
    }

    if (data instanceof Map) {
      return this.serialize(Array.from(data.entries()), hasBlobRef)
    }

    if (Array.isArray(data)) {
      const json = data.map(v => v === undefined ? null : this.serialize(v, hasBlobRef)[0])
      return [json, hasBlobRef.value]
    }

    if (isObject(data)) {
      const json: Record<string, unknown> = {}

      for (const k in data) {
        json[k] = this.serialize(data[k], hasBlobRef)[0]
      }

      return [json, hasBlobRef.value]
    }

    if (typeof data === 'bigint' || data instanceof RegExp || data instanceof URL) {
      return [data.toString(), hasBlobRef.value]
    }

    if (data instanceof Date) {
      return [Number.isNaN(data.getTime()) ? null : data.toISOString(), hasBlobRef.value]
    }

    if (Number.isNaN(data)) {
      return [null, hasBlobRef.value]
    }

    return [data, hasBlobRef.value]
  }
}
