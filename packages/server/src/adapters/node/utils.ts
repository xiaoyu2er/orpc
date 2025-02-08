import type { StandardBody, StandardHeaders, StandardRequest, StandardResponse } from '../standard'
import type { NodeHttpRequest, NodeHttpResponse } from './types'
import { Buffer, File } from 'node:buffer'
import { Readable } from 'node:stream'
import { once } from '@orpc/shared'
import { contentDisposition, parse as parseContentDisposition } from '@tinyhttp/content-disposition'

export function nodeHttpToStandardRequest(
  req: NodeHttpRequest,
  res: NodeHttpResponse,
): StandardRequest {
  const method = req.method ?? 'GET'

  const protocol = ('encrypted' in req.socket && req.socket.encrypted ? 'https:' : 'http:')
  const host = req.headers.host ?? 'localhost'
  const url = new URL(req.originalUrl ?? req.url ?? '/', `${protocol}//${host}`)

  return {
    raw: { request: req, response: res },
    method,
    url,
    headers: req.headers,
    body: once(() => {
      return nodeHttpRequestToStandardBody(req)
    }),
    get signal() {
      const signal = nodeHttpResponseToAbortSignal(res)
      Object.defineProperty(this, 'signal', { value: signal, writable: true })
      return signal
    },
    set signal(value) {
      Object.defineProperty(this, 'signal', { value, writable: true })
    },
  }
}

export function nodeHttpResponseSendStandardResponse(
  res: NodeHttpResponse,
  standardResponse: StandardResponse,
): Promise<void> {
  return new Promise((resolve, reject) => {
    res.on('error', reject)
    res.on('finish', resolve)

    const resHeaders: StandardHeaders = standardResponse.headers

    delete resHeaders['content-type']
    delete resHeaders['content-disposition']

    if (standardResponse.body === undefined) {
      res.writeHead(standardResponse.status, standardResponse.headers)
      res.end()

      return
    }

    if (standardResponse.body instanceof Blob) {
      resHeaders['content-type'] = standardResponse.body.type
      resHeaders['content-length'] = standardResponse.body.size.toString()
      resHeaders['content-disposition'] = contentDisposition(standardResponse.body instanceof File ? standardResponse.body.name : 'blob')

      res.writeHead(standardResponse.status, resHeaders)
      Readable.fromWeb(
        standardResponse.body.stream() as any, // Conflict between types=node and lib=dom so we need to cast it
      ).pipe(res)

      return
    }

    if (standardResponse.body instanceof FormData) {
      const response = new Response(standardResponse.body)

      resHeaders['content-type'] = response.headers.get('content-type')!

      res.writeHead(standardResponse.status, resHeaders)
      Readable.fromWeb(
        response.body! as any, // Conflict between types=node and lib=dom so we need to cast it
      ).pipe(res)

      return
    }

    if (standardResponse.body instanceof URLSearchParams) {
      resHeaders['content-type'] = 'application/x-www-form-urlencoded'

      res.writeHead(standardResponse.status, resHeaders)
      res.end(standardResponse.body.toString())

      return
    }

    resHeaders['content-type'] = 'application/json'

    res.writeHead(standardResponse.status, resHeaders)
    res.end(JSON.stringify(standardResponse.body))
  })
}

async function nodeHttpRequestToStandardBody(req: NodeHttpRequest): Promise<StandardBody> {
  const method = req.method ?? 'GET'
  if (method === 'GET' || method === 'HEAD') {
    return undefined
  }

  const contentDisposition = req.headers['content-disposition']
  const contentType = req.headers['content-type']

  if (typeof contentDisposition === 'string') {
    const parsedFileName = parseContentDisposition(contentDisposition).parameters.filename

    const fileName = typeof parsedFileName === 'string' ? parsedFileName : 'blob'

    return await streamToFile(req, fileName, contentType || 'application/octet-stream') as any // Conflict between types=node and lib=dom so we need to cast it
  }

  if (!contentType || contentType.startsWith('application/json')) {
    const text = await streamToString(req)

    if (!text) {
      return undefined
    }

    return JSON.parse(text)
  }

  if (contentType.startsWith('multipart/form-data')) {
    return await streamToFormData(req, contentType)
  }

  if (contentType.startsWith('application/x-www-form-urlencoded')) {
    const text = await streamToString(req)
    return new URLSearchParams(text)
  }

  if (contentType.startsWith('text/')) {
    return await streamToString(req)
  }

  return streamToFile(req, 'blob', contentType) as any // Conflict between types=node and lib=dom so we need to cast it
}

function streamToFormData(stream: Readable, contentType: string): Promise<FormData> {
  const response = new Response(stream as any, { // Conflict between types=node and lib=dom so we need to cast it
    headers: {
      'content-type': contentType,
    },
  })

  return response.formData()
}

async function streamToString(stream: Readable): Promise<string> {
  let string = ''

  for await (const chunk of stream) {
    string += chunk.toString()
  }

  return string
}

async function streamToFile(stream: Readable, fileName: string, contentType: string): Promise<File> {
  const chunks: Buffer[] = []

  for await (const chunk of stream) {
    chunks.push(chunk)
  }

  return new File([Buffer.concat(chunks)], fileName, { type: contentType })
}

function nodeHttpResponseToAbortSignal(res: NodeHttpResponse): AbortSignal {
  const controller = new AbortController()
  res.on('close', () => {
    controller.abort()
  })

  return controller.signal
}
