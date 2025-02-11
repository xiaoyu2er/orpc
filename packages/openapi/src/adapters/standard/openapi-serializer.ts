import type { PublicJSONSerializer } from '../../json-serializer'
import { findDeepMatches, isAsyncIteratorObject } from '@orpc/shared'
import { JSONSerializer } from '../../json-serializer'
import * as BracketNotation from './bracket-notation'

export interface OpenAPISerializerOptions {
  jsonSerializer?: PublicJSONSerializer
}

export class OpenAPISerializer {
  private readonly jsonSerializer: PublicJSONSerializer

  constructor(options?: OpenAPISerializerOptions) {
    this.jsonSerializer = options?.jsonSerializer ?? new JSONSerializer()
  }

  serialize(data: unknown): unknown {
    if (data === undefined || data instanceof Blob || isAsyncIteratorObject(data)) {
      return data
    }

    const serializedJSON = this.jsonSerializer.serialize(data)
    const { values: blobs } = findDeepMatches(v => v instanceof Blob, serializedJSON)

    if (blobs.length === 0) {
      return serializedJSON
    }

    const form = new FormData()

    for (const [path, value] of BracketNotation.serialize(serializedJSON)) {
      if (
        typeof value === 'string'
        || typeof value === 'number'
        || typeof value === 'boolean'
      ) {
        form.append(path, value.toString())
      }
      else if (value instanceof Date) {
        form.append(path, value.toISOString())
      }
      else if (value instanceof Blob) {
        form.append(path, value)
      }
    }

    return form
  }

  deserialize(serialized: unknown): unknown {
    if (serialized instanceof URLSearchParams || serialized instanceof FormData) {
      return BracketNotation.deserialize([...serialized.entries()])
    }

    return serialized
  }
}
