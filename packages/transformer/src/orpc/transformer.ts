/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import SuperJSON from 'superjson'
import type { Body, Transformer } from '../types'
import { findDeepMatches } from '../utils/find-deep-matches'
import { parseJSONSafely } from '../utils/parse-json-safely'
import { setObject } from '../utils/set-object'

export class ORPCTransformer implements Transformer {
  serialize(payload: unknown): { body: Body; headers: Headers } {
    const headers = new Headers()
    let body: string | FormData | Blob | undefined

    const { json, meta } = SuperJSON.serialize(payload)
    const { maps, values } = findDeepMatches((v) => v instanceof Blob, json)

    if (values.length > 0) {
      body = new FormData()
      body.append('data', JSON.stringify(json))
      body.append('meta', JSON.stringify(meta))
      body.append('maps', JSON.stringify(maps))

      for (const i in values) {
        const value = values[i]! as Blob
        body.append(i, value)
      }
    } else {
      headers.set('Content-Type', 'application/json')
      body = JSON.stringify({ data: json, meta })
    }

    return { body, headers }
  }

  async deserialize(re: Request | Response): Promise<unknown> {
    const contentType = re.headers.get('Content-Type')

    if (!contentType || contentType.startsWith('application/json')) {
      const text = await re.text()
      const json = parseJSONSafely(text)

      return typeof json === 'object' && json !== null && 'data' in json
        ? SuperJSON.deserialize({
            json: json.data as any,
            meta: 'meta' in json ? (json.meta as any) : undefined,
          })
        : json
    }

    if (contentType.startsWith('text/')) {
      return await re.text()
    }

    if (contentType.startsWith('multipart/form-data')) {
      const form = await re.formData()
      const rawData = form.get('data')
      const rawMeta = form.get('meta')
      const rawMaps = form.get('maps')

      if (typeof rawData !== 'string' && rawData !== null) {
        throw new Error('data must be a valid json or optional')
      }

      if (typeof rawMeta !== 'string' && rawMeta !== null) {
        throw new Error('meta must be a valid json or optional')
      }

      if (typeof rawMaps !== 'string' && rawMaps !== null) {
        throw new Error('maps must be a valid json or optional')
      }

      const data = rawData === null ? undefined : parseJSONSafely(rawData)
      const meta = rawMeta === null ? undefined : parseJSONSafely(rawMeta)
      const maps = rawMaps === null ? undefined : parseJSONSafely(rawMaps)

      const dataRef = {
        value: data,
      }

      if (Array.isArray(maps)) {
        for (const i in maps) {
          setObject(dataRef, ['value', ...maps[i]], form.get(i))
        }
      }

      return SuperJSON.deserialize({
        json: dataRef.value as any,
        meta: meta as any,
      })
    }

    return await re.blob()
  }
}
