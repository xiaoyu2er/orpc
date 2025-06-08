import type { EventMeta, StandardBody, StandardHeaders, StandardRequest, StandardResponse } from '@orpc/standard-server'
import type { EncodedMessage } from './types'
import { isAsyncIteratorObject, stringifyJSON } from '@orpc/shared'
import { flattenHeader, generateContentDisposition, getFilenameFromContentDisposition } from '@orpc/standard-server'

export enum MessageType {
  REQUEST = 1,
  RESPONSE = 2,
  EVENT_ITERATOR = 3,
  ABORT_SIGNAL = 4,
}

export type EventIteratorEvent = 'message' | 'error' | 'done'

export interface EventIteratorPayload {
  event: EventIteratorEvent
  data: unknown
  meta?: EventMeta
}

export interface RequestMessageMap {
  [MessageType.REQUEST]: Omit<StandardRequest, 'signal'>
  [MessageType.EVENT_ITERATOR]: EventIteratorPayload
  [MessageType.ABORT_SIGNAL]: void
}

export interface ResponseMessageMap {
  [MessageType.RESPONSE]: StandardResponse
  [MessageType.EVENT_ITERATOR]: EventIteratorPayload
  [MessageType.ABORT_SIGNAL]: void
}

interface BaseMessageFormat<P = unknown> {
  i: number

  /**
   * @default REQUEST | RESPONSE
   */
  t?: MessageType

  p: P
}

interface SerializedEventIteratorPayload {
  e: EventIteratorEvent
  d: unknown
  m?: EventMeta
}

interface SerializedRequestPayload {
  /**
   * The url of the request
   *
   * might be relative path if it starts with `orpc:/`
   */
  u: string

  b: StandardBody

  /**
   * @default {}
   */
  h?: StandardHeaders

  /**
   * @default POST
   */
  m?: string
}

interface SerializedResponsePayload {
  /**
   * @default 200
   */
  s?: number

  /**
   * @default {}
   */
  h?: StandardHeaders

  b: StandardBody
}

type DecodedMessageUnion<TMap extends RequestMessageMap | ResponseMessageMap> = {
  [K in keyof TMap]: [id: number, type: K, payload: TMap[K]]
}[keyof TMap]

export type DecodedRequestMessage = DecodedMessageUnion<RequestMessageMap>
export type DecodedResponseMessage = DecodedMessageUnion<ResponseMessageMap>

export async function encodeRequestMessage<T extends keyof RequestMessageMap>(
  id: number,
  type: T,
  payload: RequestMessageMap[T],
): Promise<EncodedMessage> {
  if (type === MessageType.EVENT_ITERATOR) {
    const eventPayload = payload as EventIteratorPayload
    const serializedPayload: SerializedEventIteratorPayload = {
      e: eventPayload.event,
      d: eventPayload.data,
      m: eventPayload.meta,
    }

    return encodeRawMessage({ i: id, t: type, p: serializedPayload })
  }

  if (type === MessageType.ABORT_SIGNAL) {
    return encodeRawMessage({ i: id, t: type, p: payload })
  }

  const request = payload as RequestMessageMap[MessageType.REQUEST]

  const { body: processedBody, headers: processedHeaders } = await prepareBodyAndHeadersForSerialization(
    request.body,
    request.headers,
  )

  const serializedPayload: SerializedRequestPayload = {
    u: request.url.toString().replace(/^orpc:\//, '/'),
    b: processedBody instanceof Blob ? undefined : processedBody,
    h: Object.keys(processedHeaders).length > 0 ? processedHeaders : undefined,
    m: request.method === 'POST' ? undefined : request.method,
  }

  const baseMessage: BaseMessageFormat<SerializedRequestPayload> = {
    i: id,
    p: serializedPayload,
  }

  if (processedBody instanceof Blob) {
    return encodeRawMessage(baseMessage, processedBody)
  }

  return encodeRawMessage(baseMessage)
}

export async function decodeRequestMessage(raw: EncodedMessage): Promise<DecodedRequestMessage> {
  const { json: message, blobData } = await decodeRawMessage(raw)

  const id: number = message.i
  const type: MessageType = message.t

  if (type === MessageType.EVENT_ITERATOR) {
    const payload = message.p as SerializedEventIteratorPayload

    return [id, type, { event: payload.e, data: payload.d, meta: payload.m }]
  }

  if (type === MessageType.ABORT_SIGNAL) {
    return [id, type, message.p]
  }

  const payload = message.p as SerializedRequestPayload

  const headers = payload.h ?? {}
  let body: StandardBody = payload.b

  const contentType = flattenHeader(headers['content-type'])

  if (blobData) {
    const contentDisposition = flattenHeader(headers['content-disposition'])

    if (contentDisposition === undefined && contentType?.startsWith('multipart/form-data')) {
      const tempRes = new Response(blobData, { headers: { 'content-type': contentType } })
      body = await tempRes.formData()
    }
    else {
      // if the body is a file, contentDisposition must be defined
      const filename = getFilenameFromContentDisposition(contentDisposition!) ?? 'blob'
      body = new File([blobData], filename, { type: contentType })
    }
  }
  else if (contentType?.startsWith('application/x-www-form-urlencoded') && typeof body === 'string') {
    body = new URLSearchParams(body)
  }

  return [id, MessageType.REQUEST, { url: new URL(payload.u, 'orpc:/'), headers, method: payload.m ?? 'POST', body }]
}

export async function encodeResponseMessage<T extends keyof ResponseMessageMap>(
  id: number,
  type: T,
  payload: ResponseMessageMap[T],
): Promise<EncodedMessage> {
  if (type === MessageType.EVENT_ITERATOR) {
    const eventPayload = payload as EventIteratorPayload
    const serializedPayload: SerializedEventIteratorPayload = {
      e: eventPayload.event,
      d: eventPayload.data,
      m: eventPayload.meta,
    }
    return encodeRawMessage({ i: id, t: type, p: serializedPayload })
  }

  if (type === MessageType.ABORT_SIGNAL) {
    return encodeRawMessage({ i: id, t: type, p: undefined })
  }

  const response = payload as StandardResponse
  const { body: processedBody, headers: processedHeaders } = await prepareBodyAndHeadersForSerialization(
    response.body,
    response.headers,
  )

  const serializedPayload: SerializedResponsePayload = {
    s: response.status === 200 ? undefined : response.status,
    h: Object.keys(processedHeaders).length > 0 ? processedHeaders : undefined,
    b: processedBody instanceof Blob ? undefined : processedBody,
  }

  const baseMessage: BaseMessageFormat<SerializedResponsePayload> = {
    i: id,
    p: serializedPayload,
  }

  if (processedBody instanceof Blob) {
    return encodeRawMessage(baseMessage, processedBody)
  }

  return encodeRawMessage(baseMessage)
}

export async function decodeResponseMessage(raw: EncodedMessage): Promise<DecodedResponseMessage> {
  const { json: message, blobData } = await decodeRawMessage(raw)

  const id: number = message.i
  const type: MessageType | undefined = message.t

  if (type === MessageType.EVENT_ITERATOR) {
    const payload = message.p as SerializedEventIteratorPayload

    return [id, type, { event: payload.e, data: payload.d, meta: payload.m }]
  }

  if (type === MessageType.ABORT_SIGNAL) {
    return [id, type, message.p]
  }

  const payload = message.p as SerializedResponsePayload

  const headers = payload.h ?? {}
  let body: StandardBody = payload.b

  const contentType = flattenHeader(headers['content-type'])

  if (blobData) {
    const contentDisposition = flattenHeader(headers['content-disposition'])

    // Handle FormData specifically
    if (contentDisposition === undefined && contentType?.startsWith('multipart/form-data')) {
      const tempRes = new Response(blobData, { headers: { 'content-type': contentType } })
      body = await tempRes.formData()
    }
    else {
      // if the body is a file, contentDisposition must be defined
      const filename = getFilenameFromContentDisposition(contentDisposition!) ?? 'blob'
      body = new File([blobData], filename, { type: contentType })
    }
  }
  else if (contentType?.startsWith('application/x-www-form-urlencoded') && typeof body === 'string') {
    body = new URLSearchParams(body)
  }

  return [id, MessageType.RESPONSE, { status: payload.s ?? 200, headers, body }]
}

async function prepareBodyAndHeadersForSerialization(
  body: StandardBody,
  originalHeaders: StandardHeaders | undefined,
): Promise<{ body: StandardBody | Blob | string | undefined, headers: StandardHeaders }> {
  const headers: StandardHeaders = { ...originalHeaders }

  const originalContentDisposition = headers['content-disposition']
  delete headers['content-type']
  delete headers['content-disposition']

  if (body instanceof Blob) {
    headers['content-type'] = body.type
    headers['content-disposition'] = originalContentDisposition ?? generateContentDisposition(
      body instanceof File ? body.name : 'blob',
    )

    return { body, headers }
  }

  if (body instanceof FormData) {
    const tempRes = new Response(body)
    headers['content-type'] = tempRes.headers.get('content-type')!
    const formDataBlob = await tempRes.blob()
    return { body: formDataBlob, headers }
  }

  if (body instanceof URLSearchParams) {
    headers['content-type'] = 'application/x-www-form-urlencoded'
    return { body: body.toString(), headers }
  }

  if (isAsyncIteratorObject(body)) {
    headers['content-type'] = 'text/event-stream'
    return { body: undefined, headers }
  }

  return { body, headers }
}

export function isEventIteratorHeaders(headers: StandardHeaders): boolean {
  return Boolean(flattenHeader(headers['content-type'])?.startsWith('text/event-stream') && headers['content-disposition'] === undefined)
}

/**
 * A 16-byte sentinel of 0xFF values guaranteed never to collide with UTF-8 JSON text,
 * since TextEncoder.encode never emits 0xFF (it's invalid in UTF-8).
 * We use this as an unambiguous boundary between the JSON payload and any appended binary data.
 */
const JSON_AND_BINARY_DELIMITER = 0xFF

async function encodeRawMessage(data: object, blobData?: Blob): Promise<EncodedMessage> {
  const json = stringifyJSON(data)

  if (blobData === undefined) {
    return json
  }

  return new Blob([
    new TextEncoder().encode(json),
    new Uint8Array([JSON_AND_BINARY_DELIMITER]),
    blobData,
  ]).arrayBuffer()
}

async function decodeRawMessage(raw: EncodedMessage): Promise<{ json: any, blobData?: ArrayBuffer }> {
  if (typeof raw === 'string') {
    return { json: JSON.parse(raw) }
  }

  const buffer = new Uint8Array(raw instanceof Blob ? await raw.arrayBuffer() : raw)

  const delimiterIndex = buffer.indexOf(JSON_AND_BINARY_DELIMITER)

  if (delimiterIndex === -1) {
    const jsonPart = new TextDecoder().decode(buffer)
    return { json: JSON.parse(jsonPart) }
  }

  const jsonPart = new TextDecoder().decode(buffer.slice(0, delimiterIndex))
  const blobData = buffer.slice(delimiterIndex + 1)

  return {
    json: JSON.parse(jsonPart),
    blobData: blobData.buffer,
  }
}
