import { isPlainObject } from 'is-what'
import type { ZodType } from 'zod'
import * as BracketNotation from '../bracket-notation'
import type { Body, Transformer } from '../types'
import { findDeepMatches } from '../utils/find-deep-matches'
import { parseJSONSafely } from '../utils/parse-json-safely'
import { coerceParse } from '../zod-coerce-parse'

export class UnsupportedContentTypeError extends Error {}

export class OpenAPITransformer implements Transformer {
  constructor(
    public options: {
      schema?: ZodType<any, any, any>
      serialize?: {
        accept?: string
      }
    } = {},
  ) {}

  serialize(payload: unknown): { body: Body; headers: Headers } {
    const accept = this.options.serialize?.accept
    const headers = new Headers()

    const hasBlobs =
      findDeepMatches((v) => v instanceof Blob, payload).values.length > 0

    if (
      (accept?.startsWith('multipart/form-data') ||
        (!accept && !(payload instanceof Blob) && hasBlobs)) &&
      (Array.isArray(payload) || isPlainObject(payload))
    ) {
      const form = new FormData()

      for (const [path, value] of BracketNotation.serialize(payload)) {
        if (
          typeof value === 'string' ||
          (typeof value === 'number' && !Number.isNaN(value)) ||
          typeof value === 'bigint'
        ) {
          form.append(path, value.toString())
        } else if (typeof value === 'boolean') {
          form.append(path, value ? 'true' : 'false')
        } else if (value instanceof Date && !Number.isNaN(value.valueOf())) {
          form.append(path, value.toISOString())
        } else if (value instanceof Blob) {
          form.append(path, value)
        }
      }

      return { body: form, headers }
    }

    if (
      accept?.startsWith('application/www-form-urlencoded') &&
      (Array.isArray(payload) || isPlainObject(payload))
    ) {
      const params = new URLSearchParams()

      for (const [path, value] of BracketNotation.serialize(payload)) {
        if (
          typeof value === 'string' ||
          (typeof value === 'number' && !Number.isNaN(value)) ||
          typeof value === 'bigint'
        ) {
          params.append(path, value.toString())
        } else if (typeof value === 'boolean') {
          params.append(path, value ? 'true' : 'false')
        } else if (value instanceof Date && !Number.isNaN(value.valueOf())) {
          params.append(path, value.toISOString())
        }
      }

      return { body: params.toString(), headers }
    }

    if (
      accept?.startsWith('application/json') ||
      (!accept && !(payload instanceof Blob))
    ) {
      const body = JSON.stringify(payload, (_, value) => {
        if (value instanceof Set) {
          return [...value]
        }

        if (value instanceof Map) {
          return [...value.entries()]
        }

        if (typeof value === 'bigint') {
          return value.toString()
        }

        return value
      })
      headers.set('Content-Type', 'application/json')

      return { body, headers }
    }

    if (payload instanceof Blob) {
      const contentType = payload.type || 'application/octet-stream'

      if (accept && !accept.startsWith(contentType)) {
        throw new UnsupportedContentTypeError(
          `Unsupported content-type: ${accept}`,
        )
      }

      headers.set('Content-Type', contentType)

      return { body: payload, headers }
    }

    if (accept) {
      throw new UnsupportedContentTypeError(
        `Unsupported content-type: ${accept}`,
      )
    }

    throw new Error(
      `Cannot serialize payload with typeof ${typeof payload}. This error should not never happen. Please report this issue to the maintainers.`,
    )
  }

  async deserialize(re: Request | Response): Promise<unknown> {
    const contentType = re.headers.get('Content-Type')

    if (
      ('method' in re && re.method === 'GET') ||
      contentType?.startsWith('application/x-www-form-urlencoded')
    ) {
      const params =
        'method' in re && re.method === 'GET'
          ? new URLSearchParams(re.url.split('?')[1])
          : new URLSearchParams(await re.text())

      const data = BracketNotation.deserialize([...params.entries()])

      return this.options.schema
        ? coerceParse(this.options.schema, data, { bracketNotation: true })
        : data
    }

    if (!contentType || contentType.startsWith('application/json')) {
      const text = await re.text()
      const data = parseJSONSafely(text)

      return this.options.schema ? coerceParse(this.options.schema, data) : data
    }

    if (contentType.startsWith('text/')) {
      const data = await re.text()
      return this.options.schema
        ? coerceParse(this.options.schema, data, { bracketNotation: true })
        : data
    }

    if (contentType.startsWith('multipart/form-data')) {
      const form = await re.formData()
      const data = BracketNotation.deserialize([...form.entries()])
      return this.options.schema
        ? coerceParse(this.options.schema, data, { bracketNotation: true })
        : data
    }

    const data = await re.blob()
    return this.options.schema ? coerceParse(this.options.schema, data) : data
  }
}
