import { findDeepMatches } from '@orpc/shared'
import { ORPCError } from '@orpc/shared/error'
import cd from 'content-disposition'
import { safeParse } from 'fast-content-type-parse'
import { isPlainObject } from 'is-what'
import wcmatch from 'wildcard-match'
import * as BracketNotation from '../bracket-notation'
import type { Serialized, Serializer } from '../types'

export class OpenAPISerializer implements Serializer {
  constructor(
    public options: {
      accept?: string
    } = {},
  ) {}

  serialize(payload: unknown): Serialized {
    const typeMatchers = (
      this.options.accept?.split(',').map(safeParse) ?? [{ type: '*/*' }]
    ).map(({ type }) => wcmatch(type))

    if (payload instanceof Blob) {
      const contentType = this.getBlobContentType(payload)

      if (typeMatchers.some((isMatch) => isMatch(contentType))) {
        return this.serializeAsBlob(payload)
      }
    }

    const payload_ = preSerialize(payload)
    const hasBlobs =
      findDeepMatches((v) => v instanceof Blob, payload_).values.length > 0

    const isExpectedMultipartFormData = typeMatchers.some((isMatch) =>
      isMatch('multipart/form-data'),
    )

    if (hasBlobs && isExpectedMultipartFormData) {
      return this.serializeAsMultipartFormData(payload_)
    }

    if (typeMatchers.some((isMatch) => isMatch('application/json'))) {
      return this.serializeAsJSON(payload_)
    }

    if (
      typeMatchers.some((isMatch) =>
        isMatch('application/x-www-form-urlencoded'),
      )
    ) {
      return this.serializeAsURLEncoded(payload_)
    }

    if (isExpectedMultipartFormData) {
      return this.serializeAsMultipartFormData(payload_)
    }

    throw new ORPCError({
      code: 'NOT_ACCEPTABLE',
      message: `Unsupported content-type: ${this.options.accept}`,
    })
  }

  private serializeAsJSON(payload: unknown): Serialized {
    const body = JSON.stringify(payload, (_, value) => {
      if (typeof value === 'bigint') {
        return value.toString()
      }

      return value
    })

    return {
      body,
      headers: new Headers({ 'Content-Type': 'application/json' }),
    }
  }

  private serializeAsMultipartFormData(payload: unknown): Serialized {
    const form = new FormData()

    for (const [path, value] of BracketNotation.serialize(payload)) {
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
          Number.isNaN(value.getTime()) ? 'Invalid Date' : value.toISOString(),
        )
      } else if (value instanceof Blob) {
        form.append(path, value)
      }
    }

    return {
      body: form,
      headers: new Headers(),
    }
  }

  private serializeAsURLEncoded(payload: unknown): Serialized {
    const params = new URLSearchParams()

    for (const [path, value] of BracketNotation.serialize(payload)) {
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
          Number.isNaN(value.getTime()) ? 'Invalid Date' : value.toISOString(),
        )
      }
    }

    return {
      body: params.toString(),
      headers: new Headers({
        'Content-Type': 'application/x-www-form-urlencoded',
      }),
    }
  }

  private serializeAsBlob(payload: Blob): Serialized {
    const contentType = this.getBlobContentType(payload)
    const fileName = payload instanceof File ? payload.name : 'blob'

    return {
      body: payload,
      headers: new Headers({
        'Content-Type': contentType,
        'Content-Disposition': cd(fileName),
      }),
    }
  }

  private getBlobContentType(blob: Blob): string {
    return blob.type || 'application/octet-stream'
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
  if (payload instanceof RegExp) return payload.toString()
  if (payload instanceof URL) return payload.toString()
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
