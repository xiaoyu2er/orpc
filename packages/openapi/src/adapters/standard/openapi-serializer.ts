import type { JsonValue } from '@orpc/server-standard'
import type { PublicJSONSerializer } from '../../json-serializer'
import { ORPCError, toORPCError } from '@orpc/contract'
import { EventSourceErrorEvent, getEventSourceMeta, isAsyncIteratorObject, isEventSourceMetaContainer, setEventSourceMeta } from '@orpc/server-standard'
import { findDeepMatches, mapAsyncIterator } from '@orpc/shared'
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
    if (data instanceof Blob || data === undefined) {
      return data
    }

    if (isAsyncIteratorObject(data)) {
      const mapValue = (value: unknown) => {
        const serialized = this.jsonSerializer.serialize(value)
        const eventSourceMeta = getEventSourceMeta(value)

        if (eventSourceMeta && isEventSourceMetaContainer(serialized)) {
          return setEventSourceMeta(serialized, eventSourceMeta)
        }

        return serialized
      }

      return mapAsyncIterator(data, {
        yield: mapValue,
        return: mapValue,
        error: (e) => {
          const error = new EventSourceErrorEvent({
            data: this.jsonSerializer.serialize(toORPCError(e).toJSON()) as JsonValue,
            cause: e,
          })

          const eventSourceMeta = getEventSourceMeta(e)

          if (eventSourceMeta) {
            return setEventSourceMeta(error, eventSourceMeta)
          }

          return error
        },
      })
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

    if (isAsyncIteratorObject(serialized)) {
      return mapAsyncIterator(serialized, {
        yield: value => value,
        return: value => value,
        error(e) {
          if (!(e instanceof EventSourceErrorEvent) || !ORPCError.isValidJSON(e.data)) {
            return e
          }

          const error = ORPCError.fromJSON(e.data)
          const eventSourceMeta = getEventSourceMeta(e)

          if (eventSourceMeta) {
            return setEventSourceMeta(error, eventSourceMeta)
          }

          return error
        },
      })
    }

    return serialized
  }
}
