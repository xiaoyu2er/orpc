import { ORPCError } from '@orpc/server'
import { findDeepMatches, isPlainObject } from '@orpc/shared'
import cd from 'content-disposition'
import { safeParse } from 'fast-content-type-parse'
import wcmatch from 'wildcard-match'
import * as BracketNotation from './bracket-notation'

export class OpenAPIPayloadCodec {
  encode(payload: unknown, accept?: string): { body: FormData | Blob | string | undefined, headers?: Headers } {
    const typeMatchers = (
      accept?.split(',').map(safeParse) ?? [{ type: '*/*' }]
    ).map(({ type }) => wcmatch(type))

    if (payload instanceof Blob) {
      const contentType = payload.type || 'application/octet-stream'

      if (typeMatchers.some(isMatch => isMatch(contentType))) {
        const headers = new Headers({
          'Content-Type': contentType,
        })

        if (payload instanceof File && payload.name) {
          headers.append('Content-Disposition', cd(payload.name))
        }

        return {
          body: payload,
          headers,
        }
      }
    }

    const handledPayload = this.serialize(payload)
    const hasBlobs = findDeepMatches(v => v instanceof Blob, handledPayload).values.length > 0

    const isExpectedMultipartFormData = typeMatchers.some(isMatch =>
      isMatch('multipart/form-data'),
    )

    if (hasBlobs && isExpectedMultipartFormData) {
      return this.encodeAsFormData(handledPayload)
    }

    if (typeMatchers.some(isMatch => isMatch('application/json'))) {
      return this.encodeAsJSON(handledPayload)
    }

    if (
      typeMatchers.some(isMatch =>
        isMatch('application/x-www-form-urlencoded'),
      )
    ) {
      return this.encodeAsURLSearchParams(handledPayload)
    }

    if (isExpectedMultipartFormData) {
      return this.encodeAsFormData(handledPayload)
    }

    throw new ORPCError({
      code: 'NOT_ACCEPTABLE',
      message: `Unsupported content-type: ${accept}`,
    })
  }

  private encodeAsJSON(payload: unknown) {
    if (payload === undefined) {
      return {
        body: undefined,
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
      }
    }

    return {
      body: JSON.stringify(payload),
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
    }
  }

  private encodeAsFormData(payload: unknown) {
    const form = new FormData()

    for (const [path, value] of BracketNotation.serialize(payload)) {
      if (
        typeof value === 'string'
        || typeof value === 'number'
        || typeof value === 'boolean'
      ) {
        form.append(path, value.toString())
      }
      else if (value === null) {
        form.append(path, 'null')
      }
      else if (value instanceof Date) {
        form.append(
          path,
          Number.isNaN(value.getTime()) ? 'Invalid Date' : value.toISOString(),
        )
      }
      else if (value instanceof Blob) {
        form.append(path, value)
      }
    }

    return {
      body: form,
    }
  }

  private encodeAsURLSearchParams(payload: unknown) {
    const params = new URLSearchParams()

    for (const [path, value] of BracketNotation.serialize(payload)) {
      if (
        typeof value === 'string'
        || typeof value === 'number'
        || typeof value === 'boolean'
      ) {
        params.append(path, value.toString())
      }
      else if (value === null) {
        params.append(path, 'null')
      }
      else if (value instanceof Date) {
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

  serialize(payload: unknown): unknown {
    if (payload instanceof Set)
      return this.serialize([...payload])
    if (payload instanceof Map)
      return this.serialize([...payload.entries()])
    if (Array.isArray(payload)) {
      return payload.map(v => (v === undefined ? 'undefined' : this.serialize(v)))
    }
    if (Number.isNaN(payload))
      return 'NaN'
    if (typeof payload === 'bigint')
      return payload.toString()
    if (payload instanceof Date && Number.isNaN(payload.getTime())) {
      return 'Invalid Date'
    }
    if (payload instanceof RegExp)
      return payload.toString()
    if (payload instanceof URL)
      return payload.toString()
    if (!isPlainObject(payload))
      return payload
    return Object.keys(payload).reduce(
      (carry, key) => {
        const val = payload[key]
        carry[key] = this.serialize(val)
        return carry
      },
      {} as Record<string, unknown>,
    )
  }

  async decode(re: Request | Response | Headers | URLSearchParams | FormData): Promise<unknown> {
    if (
      re instanceof Headers
      || re instanceof URLSearchParams
      || re instanceof FormData
    ) {
      return BracketNotation.deserialize([...re.entries()])
    }

    const contentType = re.headers.get('Content-Type')
    const contentDisposition = re.headers.get('Content-Disposition')
    const fileName = contentDisposition ? cd.parse(contentDisposition).parameters.filename : undefined

    if (fileName) {
      const blob = await re.blob()
      const file = new File([blob], fileName, {
        type: blob.type,
      })

      return file
    }

    if (!contentType || contentType.startsWith('application/json')) {
      if (!re.body) {
        return undefined
      }

      return await re.json()
    }

    if (contentType.startsWith('application/x-www-form-urlencoded')) {
      const params = new URLSearchParams(await re.text())
      return this.decode(params)
    }

    if (contentType.startsWith('text/')) {
      const text = await re.text()
      return text
    }

    if (contentType.startsWith('multipart/form-data')) {
      const form = await re.formData()
      return this.decode(form)
    }

    const blob = await re.blob()
    return new File([blob], 'blob', {
      type: blob.type,
    })
  }
}

export type PublicOpenAPIPayloadCodec = Pick<OpenAPIPayloadCodec, keyof OpenAPIPayloadCodec>
