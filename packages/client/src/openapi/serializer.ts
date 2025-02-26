import type { JsonValue } from '@orpc/server-standard'
import { ErrorEvent, isAsyncIteratorObject } from '@orpc/server-standard'
import { ORPCError, toORPCError } from '../error'
import { mapEventIterator } from '../event-iterator'
import * as BracketNotation from './bracket-notation'
import { OpenAPIJsonSerializer } from './json-serializer'

export class OpenAPISerializer {
  constructor(
    private readonly jsonSerializer = new OpenAPIJsonSerializer(),
  ) {
  }

  serialize(data: unknown): unknown {
    if (isAsyncIteratorObject(data)) {
      return mapEventIterator(data, {
        value: async value => this.#serialize(value, false),
        error: async (e) => {
          if (e instanceof ErrorEvent) {
            return new ErrorEvent({
              data: this.#serialize(e.data, false) as JsonValue,
              cause: e,
            })
          }

          return new ErrorEvent({
            data: this.#serialize(toORPCError(e).toJSON(), false) as JsonValue,
            cause: e,
          })
        },
      })
    }

    return this.#serialize(data, true)
  }

  #serialize(data: unknown, enableFormData: boolean): unknown {
    if (data instanceof Blob || data === undefined) {
      return data
    }

    const [json, hasBlob] = this.jsonSerializer.serialize(data)

    if (!enableFormData || !hasBlob) {
      return json
    }

    const form = new FormData()

    for (const [path, value] of BracketNotation.serialize(json)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        form.append(path, value.toString())
      }
      else if (value instanceof Blob) {
        form.append(path, value)
      }
    }

    return form
  }

  deserialize(data: unknown): unknown {
    if (data instanceof URLSearchParams || data instanceof FormData) {
      return BracketNotation.deserialize(Array.from(data.entries()))
    }

    if (isAsyncIteratorObject(data)) {
      return mapEventIterator(data, {
        value: async value => value,
        error: async (e) => {
          if (e instanceof ErrorEvent && ORPCError.isValidJSON(e.data)) {
            return ORPCError.fromJSON(e.data, { cause: e })
          }

          return e
        },
      })
    }

    return data
  }
}
