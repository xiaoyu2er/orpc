import type { StandardBody, StandardHeaders, StandardRequest, StandardResponse } from '../standard'
import { once } from '@orpc/shared'
import cd from 'content-disposition'

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
  const fileName = contentDisposition ? cd.parse(contentDisposition).parameters.filename : undefined

  if (fileName) {
    const blob = await re.blob()
    return new File([blob], fileName, {
      type: blob.type,
    })
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

  if (response.body instanceof File && !fetchHeaders.has('content-disposition')) {
    fetchHeaders.set('content-disposition', cd(response.body.name))
  }
  else if (
    !(response.body instanceof Blob)
    && !(response.body instanceof URLSearchParams)
    && !(response.body instanceof FormData)
    && response.body !== undefined
    && !fetchHeaders.has('content-type')
  ) {
    fetchHeaders.set('content-type', 'application/json')
  }

  return fetchHeaders
}

export function standardBodyToFetchBody(body: StandardBody): Blob | FormData | URLSearchParams | string | undefined {
  if (
    body instanceof Blob
    || body instanceof FormData
    || body instanceof URLSearchParams
  ) {
    return body
  }

  return JSON.stringify(body) as string | undefined // stringify can return undefined if the body is undefined
}

export function standardResponseToFetchResponse(response: StandardResponse): Response {
  return new Response(standardBodyToFetchBody(response.body), {
    headers: standardResponseToFetchHeaders(response),
    status: response.status,
  })
}
