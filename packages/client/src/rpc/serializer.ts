import { isAsyncIteratorObject, stringifyJSON } from '@orpc/shared'
import { ErrorEvent } from '@orpc/standard-server'
import { ORPCError, toORPCError } from '../error'
import { mapEventIterator } from '../event-iterator'
import { RPCJsonSerializer } from './json-serializer'

export class RPCSerializer {
  constructor(
    private readonly jsonSerializer: RPCJsonSerializer = new RPCJsonSerializer(),
  ) {}

  serialize(data: unknown): unknown {
    if (isAsyncIteratorObject(data)) {
      return mapEventIterator(data, {
        value: async (value: unknown) => this.#serialize(value, false),
        error: async (e) => {
          if (e instanceof ErrorEvent) {
            return new ErrorEvent({
              data: this.#serialize(e.data, false),
              cause: e,
            })
          }

          return new ErrorEvent({
            data: this.#serialize(toORPCError(e).toJSON(), false),
            cause: e,
          })
        },
      })
    }

    return this.#serialize(data, true)
  }

  #serialize(
    data: unknown,
    enableFormData: boolean,
  ): unknown {
    if (data === undefined || data instanceof Blob) {
      return data
    }

    const [json, meta_, maps, blobs] = this.jsonSerializer.serialize(data)

    const meta = meta_.length === 0 ? undefined : meta_

    if (!enableFormData || blobs.length === 0) {
      return {
        json,
        meta,
      }
    }

    const form = new FormData()

    form.set('data', stringifyJSON({ json, meta, maps }))

    blobs.forEach((blob, i) => {
      form.set(i.toString(), blob)
    })

    return form
  }

  deserialize(data: unknown): unknown {
    if (isAsyncIteratorObject(data)) {
      return mapEventIterator(data, {
        value: async value => this.#deserialize(value),
        error: async (e) => {
          if (!(e instanceof ErrorEvent)) {
            return e
          }

          const deserialized = this.#deserialize(e.data)

          if (ORPCError.isValidJSON(deserialized)) {
            return ORPCError.fromJSON(deserialized, { cause: e })
          }

          return new ErrorEvent({
            data: deserialized,
            cause: e,
          })
        },
      })
    }

    return this.#deserialize(data)
  }

  #deserialize(data: unknown): unknown {
    if (data === undefined || data instanceof Blob) {
      return data
    }

    if (!(data instanceof FormData)) {
      return this.jsonSerializer.deserialize((data as any).json, (data as any).meta ?? [])
    }

    const serialized = JSON.parse(data.get('data') as string)

    return this.jsonSerializer.deserialize(
      serialized.json,
      serialized.meta ?? [],
      serialized.maps,
      (i: number) => data.get(i.toString()) as Blob,
    )
  }
}
