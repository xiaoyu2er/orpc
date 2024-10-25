/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import type { Body, Transformer } from '../types'
import { parseJSONSafely } from '../utils/parse-json-safely'

export class OpenAPITransformer implements Transformer {
  serialize(payload: unknown): { body: Body; headers: Headers } {
    const headers = new Headers()

    // TODO: support more data type

    const body = JSON.stringify(payload, (_, value) => {
      if (value instanceof Set) {
        return [...value]
      }

      if (value instanceof Map) {
        return [...value.entries()]
      }

      return value
    })
    headers.set('Content-Type', 'application/json')

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
      throw new Error('TODO: multipart/form-data is not implemented yet')
    }

    return await re.blob()
  }
}
