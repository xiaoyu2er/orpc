import type { JsonValue } from '@orpc/shared'
import type { EventSourceMessage } from 'eventsource-parser/stream'
import { isAsyncIteratorObject, once, parseEmptyableJSON } from '@orpc/shared'
import { contentDisposition, parse as parseContentDisposition } from '@tinyhttp/content-disposition'
import { encode as encodeEventSource } from 'eventsource-encoder'
import { EventSourceParserStream } from 'eventsource-parser/stream'
import { SSEErrorEvent, type StandardBody, type StandardHeaders, type StandardRequest, type StandardResponse } from '../standard'

function fetchHeadersToStandardHeaders(headers: Headers): StandardHeaders {
  const standardHeaders: StandardHeaders = {}

  for (const [key, value] of headers) {
    if (Array.isArray(standardHeaders[key])) {
      standardHeaders[key].push(value)
    }
    else if (standardHeaders[key] !== undefined) {
      standardHeaders[key] = [standardHeaders[key], value]
    }
    else {
      standardHeaders[key] = value
    }
  }

  return standardHeaders
}

export async function fetchReToStandardBody(re: Request | Response): Promise<StandardBody> {
  if (!re.body) {
    return undefined
  }

  const contentDisposition = re.headers.get('content-disposition')

  if (contentDisposition) {
    const fileName = parseContentDisposition(contentDisposition).parameters.filename

    if (typeof fileName === 'string') {
      const blob = await re.blob()
      return new File([blob], fileName, {
        type: blob.type,
      })
    }
  }

  const contentType = re.headers.get('content-type')

  if (!contentType || contentType.startsWith('application/json')) {
    const text = await re.text()

    if (!text) {
      return undefined
    }

    return JSON.parse(text)
  }

  if (contentType.startsWith('multipart/form-data')) {
    return await re.formData()
  }

  if (contentType.startsWith('application/x-www-form-urlencoded')) {
    return new URLSearchParams(await re.text())
  }

  if (contentType.startsWith('text/event-stream')) {
    const eventStream = re.body
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new EventSourceParserStream())
      .pipeThrough(new TransformStream<EventSourceMessage, { event: 'message' | 'error' | 'done', data: JsonValue | undefined }>({
        transform(chunk, controller) {
          const event = chunk.event ?? 'message'

          if (event === 'message' || event === 'error' || event === 'done') {
            controller.enqueue({
              event,
              data: parseEmptyableJSON(chunk.data),
            })
          }
        },
      }))

    const reader = eventStream.getReader()

    async function* toAsyncGenerator() {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            break
          }

          if (value.event === 'message') {
            yield value.data
          }
          else if (value.event === 'error') {
            throw new SSEErrorEvent(value.data)
          }
          else if (value.event === 'done') {
            return value.data
          }
        }
      }
      finally {
        reader.cancel()
      }
    }

    return toAsyncGenerator()
  }

  if (contentType.startsWith('text/')) {
    return await re.text()
  }

  const blob = await re.blob()
  return new File([blob], 'blob', {
    type: blob.type,
  })
}

export function fetchRequestToStandardRequest(request: Request): StandardRequest {
  const url = new URL(request.url)

  return {
    raw: { request },
    url,
    signal: request.signal,
    method: request.method,
    body: once(() => {
      return fetchReToStandardBody(request)
    }),
    get headers() {
      const headers = fetchHeadersToStandardHeaders(request.headers)
      Object.defineProperty(this, 'headers', { value: headers, writable: true })
      return headers
    },
    set headers(value) {
      Object.defineProperty(this, 'headers', { value, writable: true })
    },
  }
}

function standardResponseToFetchHeaders(response: StandardResponse): Headers {
  const fetchHeaders = new Headers()

  for (const [key, value] of Object.entries(response.headers)) {
    if (Array.isArray(value)) {
      for (const v of value) {
        fetchHeaders.append(key, v)
      }
    }
    else if (value !== undefined) {
      fetchHeaders.append(key, value)
    }
  }

  return fetchHeaders
}

export function standardResponseToFetchResponse(response: StandardResponse): Response {
  const resHeaders = standardResponseToFetchHeaders(response)

  resHeaders.delete('content-type')
  resHeaders.delete('content-disposition')

  if (response.body === undefined) {
    return new Response(undefined, { headers: resHeaders, status: response.status })
  }

  if (response.body instanceof Blob) {
    resHeaders.set('content-type', response.body.type)
    resHeaders.set('content-length', response.body.size.toString())
    resHeaders.set(
      'content-disposition',
      contentDisposition(response.body instanceof File ? response.body.name : 'blob', { type: 'inline' }),
    )

    return new Response(response.body, { headers: resHeaders, status: response.status })
  }

  if (response.body instanceof FormData) {
    return new Response(response.body, { headers: resHeaders, status: response.status })
  }

  if (response.body instanceof URLSearchParams) {
    return new Response(response.body, { headers: resHeaders, status: response.status })
  }

  if (isAsyncIteratorObject(response.body)) {
    resHeaders.set('content-type', 'text/event-stream')
    const generator = response.body
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await generator.next()
            if (done) {
              controller.enqueue(encoder.encode(encodeEventSource({
                data: JSON.stringify(value),
                event: 'done',
              })))

              break
            }

            controller.enqueue(encoder.encode(encodeEventSource({
              data: JSON.stringify(value),
              event: 'message',
            })))
          }
        }
        catch (error) {
          const data = error instanceof SSEErrorEvent ? error.data : undefined

          controller.enqueue(encoder.encode(encodeEventSource({
            data: JSON.stringify(data),
            event: 'message',
          })))
        }
        finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: resHeaders,
      status: response.status,
    })
  }

  resHeaders.set('content-type', 'application/json')

  return new Response(JSON.stringify(response.body), { headers: resHeaders, status: response.status })
}
