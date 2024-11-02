import cd from 'content-disposition'
import { isPlainObject } from 'is-what'
import * as BracketNotation from '../bracket-notation'
import type { Body, Serializer } from '../types'
import { findDeepMatches } from '../utils/object'

export class UnsupportedContentTypeError extends Error {}

export class OpenAPISerializer implements Serializer {
  constructor(
    public options: {
      accept?: string
    } = {},
  ) {}

  serialize(payload: unknown): { body: Body; headers: Headers } {
    const accept = this.options.accept
    const headers = new Headers()
    const payload_ = preSerialize(payload)

    const hasBlobs =
      findDeepMatches((v) => v instanceof Blob, payload_).values.length > 0

    if (
      accept?.startsWith('multipart/form-data') ||
      (!accept && !(payload_ instanceof Blob) && hasBlobs)
    ) {
      const form = new FormData()

      for (const [path, value] of BracketNotation.serialize(payload_)) {
        if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'bigint' ||
          typeof value === 'boolean'
        ) {
          form.append(path, value.toString())
        } else if (value === null) {
          form.append(path, 'null')
        } else if (value instanceof Date && !Number.isNaN(value.valueOf())) {
          form.append(
            path,
            Number.isNaN(value.getTime())
              ? 'Invalid Date'
              : value.toISOString(),
          )
        } else if (value instanceof Blob) {
          form.append(path, value)
        }
      }

      return { body: form, headers }
    }

    if (accept?.startsWith('application/www-form-urlencoded')) {
      const params = new URLSearchParams()

      for (const [path, value] of BracketNotation.serialize(payload_)) {
        if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'bigint' ||
          typeof value === 'boolean'
        ) {
          params.append(path, value.toString())
        } else if (value === null) {
          params.append(path, 'null')
        } else if (value instanceof Date && !Number.isNaN(value.valueOf())) {
          params.append(
            path,
            Number.isNaN(value.getTime())
              ? 'Invalid Date'
              : value.toISOString(),
          )
        }
      }
      headers.set('Content-Type', 'application/x-www-form-urlencoded')

      return { body: params.toString(), headers }
    }

    if (
      accept?.startsWith('application/json') ||
      (!accept && !(payload_ instanceof Blob))
    ) {
      const body = JSON.stringify(payload_, (_, value) => {
        if (typeof value === 'bigint') {
          return value.toString()
        }

        return value
      })
      headers.set('Content-Type', 'application/json')

      return { body, headers }
    }

    if (payload_ instanceof Blob) {
      const contentType = payload_.type || 'application/octet-stream'

      if (accept && !accept.startsWith(contentType)) {
        throw new UnsupportedContentTypeError(
          `Unsupported content-type: ${accept}`,
        )
      }

      const fileName = payload_ instanceof File ? payload_.name : 'blob'

      headers.set('Content-Type', contentType)
      headers.set('Content-Disposition', cd(fileName))

      return { body: payload_, headers }
    }

    if (accept) {
      throw new UnsupportedContentTypeError(
        `Unsupported content-type: ${accept}`,
      )
    }

    throw new Error(
      `Cannot serialize payload with typeof ${typeof payload_}. This error should not never happen. Please report this issue to the maintainers.`,
    )
  }
}

function preSerialize(payload: unknown): unknown {
  if (payload instanceof Set) return preSerialize([...payload])
  if (payload instanceof Map) return preSerialize([...payload.entries()])
  if (Array.isArray(payload)) {
    return payload.map((v) => (v === undefined ? 'undefined' : preSerialize(v)))
  }
  if (Number.isNaN(payload)) return 'NaN'
  if (payload instanceof Date && Number.isNaN(payload.getTime())) {
    return 'Invalid Date'
  }
  if (!isPlainObject(payload)) return payload
  return Object.keys(payload).reduce(
    (carry, key) => {
      const val = payload[key]
      carry[key] = preSerialize(val)
      return carry
    },
    {} as Record<string, unknown>,
  )
}
