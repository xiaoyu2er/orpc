import type { EventMeta, StandardBody, StandardHeaders, StandardRequest, StandardResponse } from '@orpc/standard-server'
import { isAsyncIteratorObject, stringifyJSON, toArray } from '@orpc/shared'
import { generateContentDisposition, getFilenameFromContentDisposition } from '@orpc/standard-server'

export interface EventIteratorPayload {
  event: 'message' | 'error' | 'done'
  data: unknown
  meta: EventMeta
}

export interface RequestMessageMap {
  REQUEST: Omit<StandardRequest, 'signal'>
  EVENT_ITERATOR: EventIteratorPayload
  ABORT_SIGNAL: void
}

export interface ResponseMessageMap {
  RESPONSE: StandardResponse
  EVENT_ITERATOR: EventIteratorPayload
  ABORT_SIGNAL: void
}

export type RawMessage = string | ArrayBuffer | Blob | ArrayBufferView

export async function encodeRequestMessage<T extends keyof RequestMessageMap>(
  id: number,
  type: T,
  payload: RequestMessageMap[T],
): Promise<RawMessage> {
  const stringify = (payload: any) => stringifyJSON({ id, type, payload })

  if (type !== 'REQUEST') {
    return stringify(payload)
  }

  const request = payload as StandardRequest

  const headers = { ...request.headers }

  const body = await standalizeBody(request.body, headers)

  if (body instanceof Blob) {
    const c = {
      url: request.url,
      headers,
      method: request.method === 'POST' ? undefined : request.method,
    } satisfies Partial<StandardRequest>

    const json = stringify(c)

    const binary = new TextEncoder().encode(json)

    return new Blob([
      numberToBuffer(binary.length),
      binary,
      body,
    ])
  }

  return stringify({
    url: request.url,
    body,
    headers: Object.keys(headers).length ? headers : undefined,
    method: request.method === 'POST' ? undefined : request.method,
  } satisfies Partial<StandardRequest>)
}

export async function decodeRequestMessage(
  raw: RawMessage,
): Promise<{
    [K in keyof RequestMessageMap]: [id: number, type: K, payload: RequestMessageMap[K]]
  }[keyof RequestMessageMap]> {
  if (typeof raw === 'string') {
    const message = JSON.parse(raw)

    const payload = message.type === 'REQUEST'
      ? {
          ...message.payload,
          url: new URL(message.payload.url),
          headers: message.payload.headers ?? {},
          method: message.payload.method ?? 'POST',
          body: message.payload.headers?.['content-type']?.startsWith('application/x-www-form-urlencoded')
            ? new URLSearchParams(message.payload.body)
            : message.payload.body,
        }
      : message.payload

    return [message.id, message.type, payload]
  }

  const buffer = raw instanceof Blob ? await raw.arrayBuffer() : raw instanceof ArrayBuffer ? raw : raw.buffer

  const length = bufferToNumber(buffer.slice(0, 8))

  const json = new TextDecoder().decode(buffer.slice(8, 8 + length))

  const message = JSON.parse(json)
  const request: StandardRequest = {
    ...message.payload,
    url: new URL(message.payload.url),
    headers: message.payload.headers,
    method: message.payload.method ?? 'POST',
  }

  const body = buffer.slice(8 + length)

  const contentDisposition = toArray(request.headers['content-disposition'])[0]!
  const contentType = toArray(request.headers['content-type'])[0]!

  if (contentDisposition === undefined && contentType.startsWith('multipart/form-data')) {
    const res = new Response(body, { headers: { 'content-type': contentType } })

    return [
      message.id,
      message.type,
      {
        ...request,
        body: await res.formData(),
      },
    ]
  }

  const name = getFilenameFromContentDisposition(contentDisposition) ?? 'blob'

  return [message.id, message.type, {
    ...request,
    body: new File([body], name, { type: contentType }),
  }]
}

export async function encodeResponseMessage<T extends keyof ResponseMessageMap>(
  id: number,
  type: T,
  payload: ResponseMessageMap[T],
): Promise<RawMessage> {
  const stringify = (payload: any) => stringifyJSON({ id, type, payload })

  if (type !== 'RESPONSE') {
    return stringify(payload)
  }

  const response = payload as StandardResponse

  const headers = { ...response.headers }
  const body = await standalizeBody(response.body, headers)

  if (body instanceof Blob) {
    const c = {
      status: response.status === 200 ? undefined : response.status,
      headers,
    }

    const json = stringify(c)
    const binary = new TextEncoder().encode(json)

    return new Blob([
      numberToBuffer(binary.length),
      binary,
      body,
    ])
  }

  return stringify({
    status: response.status === 200 ? undefined : response.status,
    headers: Object.keys(headers).length ? headers : undefined,
    body,
  })
}

export async function decodeResponseMessage(
  raw: RawMessage,
): Promise<{
    [K in keyof ResponseMessageMap]: [id: number, type: K, payload: ResponseMessageMap[K]]
  }[keyof ResponseMessageMap]> {
  if (typeof raw === 'string') {
    const message = JSON.parse(raw)

    const payload = message.type === 'RESPONSE'
      ? {
          ...message.payload,
          status: message.payload.status ?? 200,
          headers: message.payload.headers ?? {},
          body: message.payload.headers?.['content-type']?.startsWith('application/x-www-form-urlencoded')
            ? new URLSearchParams(message.payload.body)
            : message.payload.body,
        }
      : message.payload

    return [message.id, message.type, payload]
  }

  const buffer = raw instanceof Blob ? await raw.arrayBuffer() : raw instanceof ArrayBuffer ? raw : raw.buffer

  const length = bufferToNumber(buffer.slice(0, 8))
  const json = new TextDecoder().decode(buffer.slice(8, 8 + length))
  const message = JSON.parse(json)
  const response: StandardResponse = {
    ...message.payload,
    status: message.payload.status ?? 200,
    headers: message.payload.headers,
  }

  const body = buffer.slice(8 + length)

  const contentDisposition = toArray(response.headers['content-disposition'])[0]!
  const contentType = toArray(response.headers['content-type'])[0]!

  if (contentDisposition === undefined && contentType.startsWith('multipart/form-data')) {
    const res = new Response(body, { headers: { 'content-type': contentType } })

    return [
      message.id,
      message.type,
      {
        ...response,
        body: await res.formData(),
      },
    ]
  }

  const name = getFilenameFromContentDisposition(contentDisposition) ?? 'blob'

  return [
    message.id,
    message.type,
    {
      ...response,
      body: new File([body], name, { type: contentType }),
    },
  ]
}

/**
 * @param body
 * @param headers - WARNING: The headers can be changed by the function and effects on the original headers.
 */
async function standalizeBody(body: StandardBody, headers: StandardHeaders): Promise<StandardBody> {
  const currentContentDisposition = toArray(headers['content-disposition'])[0]

  delete headers['content-type']
  delete headers['content-disposition']

  if (body instanceof Blob) {
    headers['content-type'] = body.type
    headers['content-disposition'] = currentContentDisposition ?? generateContentDisposition(
      body instanceof File ? body.name : 'blob',
    )

    return body
  }

  if (body instanceof FormData) {
    const res = new Response(body)

    headers['content-type'] = res.headers.get('content-type')!

    return res.blob()
  }

  if (body instanceof URLSearchParams) {
    headers['content-type'] = 'application/x-www-form-urlencoded'

    return body.toString()
  }

  if (isAsyncIteratorObject(body)) {
    headers['content-type'] = 'text/event-stream'

    return undefined
  }

  return body
}

function numberToBuffer(num: number): ArrayBuffer {
  const buffer = new ArrayBuffer(8)
  const view = new DataView(buffer)

  view.setBigUint64(0, BigInt(num))

  return buffer
}

function bufferToNumber(buffer: ArrayBuffer): number {
  const view = new DataView(buffer)

  return Number(view.getBigUint64(0))
}
