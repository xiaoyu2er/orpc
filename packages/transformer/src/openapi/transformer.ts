/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import { construct } from '../object/construct'
import { crush } from '../object/crush'
import type { Body, Transformer } from '../types'
import { findDeepMatches } from '../utils/find-deep-matches'
import { parseJSONSafely } from '../utils/parse-json-safely'

export class OpenAPITransformer implements Transformer {
  serialize(payload: unknown): { body: Body; headers: Headers } {
    const headers = new Headers()

    let body: string | FormData | Blob | undefined

    const hasBlobs =
      findDeepMatches((v) => v instanceof Blob, payload).values.length > 0

    if (hasBlobs) {
      if (payload instanceof Blob) {
        body = payload
        headers.set('Content-Type', payload.type || 'application/octet-stream')
      } else {
        /** If payload has blob but itself is not a blob that mean always payload is a object or array  */
        const payloadAsAny = payload as any
        body = new FormData()
        for (const name in crush(payloadAsAny)) {
          const value = payloadAsAny[name]!

          if (typeof value === 'string' || typeof value === 'number') {
            body.append(name, value.toString())
          } else if (typeof value === 'boolean') {
            body.append(name, value.toString())
          } else if (value instanceof Blob) {
            body.append(name, value)
          }
        }
      }
    } else {
      body = JSON.stringify(payload, (_, value) => {
        if (value instanceof Set) {
          return [...value]
        }

        if (value instanceof Map) {
          return [...value.entries()]
        }

        return value
      })
      headers.set('Content-Type', 'application/json')
    }

    return { body, headers }
  }

  async deserialize(re: Request | Response): Promise<unknown> {
    if ('method' in re && re.method === 'GET') {
      const url = new URL(re.url)
      return { ...url.searchParams }
    }

    const contentType = re.headers.get('Content-Type')

    if (!contentType || contentType.startsWith('application/json')) {
      const text = await re.text()
      const json = parseJSONSafely(text)

      return json
    }

    if (contentType.startsWith('text/')) {
      return await re.text()
    }

    if (contentType.startsWith('multipart/form-data')) {
      const form = await re.formData()
      const data = construct([...form.entries()])
      return data
    }

    return await re.blob()
  }
}
