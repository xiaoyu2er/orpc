import type { Body, Serializer } from '../types'
import { findDeepMatches } from '../utils/object'
import * as SuperJSON from './super-json'

export class ORPCSerializer implements Serializer {
  serialize(payload: unknown): { body: Body; headers: Headers } {
    const { data, meta } = SuperJSON.serialize(payload)
    const { maps, values } = findDeepMatches((v) => v instanceof Blob, data)

    if (values.length > 0) {
      const form = new FormData()

      if (data !== undefined) {
        form.append('data', JSON.stringify(data))
      }

      form.append('meta', JSON.stringify(meta))
      form.append('maps', JSON.stringify(maps))

      for (const i in values) {
        const value = values[i]! as Blob
        form.append(i, value)
      }

      return { body: form, headers: new Headers() }
    }

    return {
      body: JSON.stringify({ data, meta }),
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
    }
  }
}
