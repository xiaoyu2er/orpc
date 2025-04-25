import type { EventMeta, StandardBody, StandardHeaders, StandardRequest, StandardResponse } from '@orpc/standard-server'
import { isAsyncIteratorObject, stringifyJSON, toArray } from '@orpc/shared'
import { generateContentDisposition, getFilenameFromContentDisposition } from '@orpc/standard-server'

export enum MessageType {
  REQUEST = 1,
  RESPONSE = 2,
  EVENT_ITERATOR = 3,
  ABORT_SIGNAL = 4,
}

export type RawMessage = string | ArrayBuffer | Blob | ArrayBufferView

export type EventIteratorEvent = 'message' | 'error' | 'done'

export interface EventIteratorPayload {
  event: EventIteratorEvent
  data: unknown
  meta: EventMeta
}

export interface RequestMessageMap {
  [MessageType.REQUEST]: Omit<StandardRequest, 'signal'>
  [MessageType.EVENT_ITERATOR]: EventIteratorPayload
  [MessageType.ABORT_SIGNAL]: undefined
}

export interface ResponseMessageMap {
  [MessageType.RESPONSE]: StandardResponse
  [MessageType.EVENT_ITERATOR]: EventIteratorPayload
  [MessageType.ABORT_SIGNAL]: undefined
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
  m: EventMeta
}

interface SerializedRequestPayload {
  /**
   * The url of the request
   *
   * might be relative path if it starts with `orpc://`
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
): Promise<RawMessage> {
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
    t: type === MessageType.REQUEST ? undefined : type,
    p: serializedPayload,
  }

  if (processedBody instanceof Blob) {
    return encodeRawMessage(baseMessage, processedBody)
  }

  return encodeRawMessage(baseMessage)
}

export async function decodeRequestMessage(raw: RawMessage): Promise<DecodedRequestMessage> {
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

  const contentType = toArray(headers['content-type'])[0]

  if (blobData) {
    const contentDisposition = toArray(headers['content-disposition'])[0]!

    if (contentDisposition === undefined && contentType?.startsWith('multipart/form-data')) {
      const tempRes = new Response(blobData, { headers: { 'content-type': contentType } })
      body = await tempRes.formData()
    }
    else {
      const filename = getFilenameFromContentDisposition(contentDisposition) ?? 'blob'
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
): Promise<RawMessage> {
  if (type === MessageType.EVENT_ITERATOR) {
    const eventPayload = payload as EventIteratorPayload
    const serializedPayload: SerializedEventIteratorPayload = {
      e: eventPayload.event,
      d: eventPayload.data,
      m: eventPayload.meta,
    }
    return stringifyJSON({ i: id, t: type, p: serializedPayload })
  }

  if (type === MessageType.ABORT_SIGNAL) {
    return stringifyJSON({ i: id, t: type, p: undefined })
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
    t: type === MessageType.RESPONSE ? undefined : type, // Explicitly undefined for default
    p: serializedPayload,
  }
  const jsonPart = stringifyJSON(baseMessage)

  if (processedBody instanceof Blob) {
    const jsonBuffer = new TextEncoder().encode(jsonPart)
    const lengthBuffer = numberToBuffer(jsonBuffer.length)
    return new Blob([lengthBuffer, jsonBuffer, processedBody])
  }

  return jsonPart
}

export async function decodeResponseMessage(raw: RawMessage): Promise<DecodedResponseMessage> {
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

  const contentType = toArray(headers['content-type'])[0]

  if (blobData) {
    const contentDisposition = toArray(headers['content-disposition'])[0]!

    // Handle FormData specifically
    if (contentDisposition === undefined && contentType?.startsWith('multipart/form-data')) {
      const tempRes = new Response(blobData, { headers: { 'content-type': contentType } })
      body = await tempRes.formData()
    }
    else {
      const filename = getFilenameFromContentDisposition(contentDisposition) ?? 'blob'
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
    const formDataBlob = await tempRes.blob()
    headers['content-type'] = tempRes.headers.get('content-type')!
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

async function encodeRawMessage(data: object, blobData?: Blob): Promise<RawMessage> {
  const json = stringifyJSON(data)
  if (blobData === undefined) {
    return json
  }

  const jsonBuffer = new TextEncoder().encode(json)
  const lengthBuffer = numberToBuffer(jsonBuffer.length)
  return new Blob([lengthBuffer, jsonBuffer, blobData])
}

const JSON_LENGTH_PREFIX_BYTES = 8

async function decodeRawMessage(raw: RawMessage): Promise<{ json: any, blobData?: ArrayBuffer }> {
  if (typeof raw === 'string') {
    return { json: JSON.parse(raw) }
  }

  const fullBuffer = raw instanceof Blob
    ? await raw.arrayBuffer()
    : raw instanceof ArrayBuffer
      ? raw
      : raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength)

  const jsonLength = bufferToNumber(fullBuffer.slice(0, JSON_LENGTH_PREFIX_BYTES))
  const jsonEndIndex = JSON_LENGTH_PREFIX_BYTES + jsonLength

  const jsonPart = new TextDecoder().decode(fullBuffer.slice(JSON_LENGTH_PREFIX_BYTES, jsonEndIndex))
  const blobData = fullBuffer.slice(jsonEndIndex)

  return {
    json: JSON.parse(jsonPart),
    blobData: blobData.byteLength > 0 ? blobData : undefined,
  }
}

function numberToBuffer(num: number): ArrayBuffer {
  const buffer = new ArrayBuffer(JSON_LENGTH_PREFIX_BYTES)
  const view = new DataView(buffer)
  view.setBigUint64(0, BigInt(num))
  return buffer
}

function bufferToNumber(buffer: ArrayBuffer): number {
  const view = new DataView(buffer)
  const bigIntValue = view.getBigUint64(0)
  return Number(bigIntValue)
}
