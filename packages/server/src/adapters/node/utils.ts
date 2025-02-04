import type { StandardBody, StandardHeaders, StandardRequest, StandardResponse } from '../standard'
import type { NodeHttpRequest, NodeHttpResponse } from './types'
import { Buffer, File } from 'node:buffer'
import { Readable } from 'node:stream'
import { once } from '@orpc/shared'
import cd from 'content-disposition'

export function nodeHttpToStandardRequest(
  req: NodeHttpRequest,
  res: NodeHttpResponse,
): StandardRequest {
  const method = req.method ?? 'GET'

  const protocol = ('encrypted' in req.socket && req.socket.encrypted ? 'https:' : 'http:')
  const host = req.headers.host ?? 'localhost'
  const url = new URL(req.originalUrl ?? req.url ?? '/', `${protocol}//${host}`)

  const body = once((): Promise<StandardBody> => {
    return nodeHttpRequestToStandardBody(req)
  })

  const signal = once((): AbortSignal => {
    return nodeHttpResponseToAbortSignal(res)
  })

  return {
    method,
    url,
    headers: req.headers,
    body,
    get signal() { return signal() },
  }
}

export function nodeHttpResponseSendStandardResponse(
  res: NodeHttpResponse,
  standardResponse: StandardResponse,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (standardResponse.body === undefined) {
      res.writeHead(standardResponse.status, standardResponse.headers)
      res.end().on('error', reject).on('finish', resolve)
    }

    if (standardResponse.body instanceof Blob) {
      const resHeaders: StandardHeaders = {
        ...standardResponse.headers,
        'content-type': standardResponse.body.type,
        'content-length': standardResponse.body.size.toString(),
      }

      if (!standardResponse.headers['content-disposition'] && standardResponse.body instanceof File) {
        resHeaders['content-disposition'] = cd(standardResponse.body.name)
      }

      res.writeHead(standardResponse.status, resHeaders)

      Readable.fromWeb(standardResponse.body.stream()).pipe(res).on('error', reject).on('finish', resolve)

      return
    }

    if (standardResponse.body instanceof FormData) {
      const response = new Response(standardResponse.body)

      res.writeHead(standardResponse.status, {
        ...standardResponse.headers,
        'content-type': response.headers.get('content-type')!,
      })

      Readable.fromWeb(response.body!).pipe(res).on('error', reject).on('finish', resolve)

      return
    }

    if (standardResponse.body instanceof URLSearchParams) {
      res.writeHead(standardResponse.status, {
        ...standardResponse.headers,
        'content-type': 'application/x-www-form-urlencoded',
      })

      const string = standardResponse.body.toString()
      res.end(string).on('error', reject).on('finish', resolve)

      return
    }

    res.writeHead(standardResponse.status, {
      ...standardResponse.headers,
      'content-type': 'application/json',
    })

    const string = JSON.stringify(standardResponse.body)
    res.end(string).on('error', reject).on('finish', resolve)
  })
}

async function nodeHttpRequestToStandardBody(req: NodeHttpRequest): Promise<StandardBody> {
  const method = req.method ?? 'GET'
  if (method === 'GET' || method === 'HEAD') {
    return undefined
  }

  const contentDisposition = req.headers['content-disposition']
  const fileName = contentDisposition ? cd.parse(contentDisposition).parameters.filename : undefined
  const contentType = req.headers['content-type']

  if (fileName) {
    return await streamToFile(req, fileName, contentType || 'application/octet-stream')
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

  return streamToFile(req, 'blob', contentType)
}

function streamToFormData(stream: Readable, contentType: string): Promise<FormData> {
  return streamToBuffer(stream).then((buffer) => {
    const response = new Response(buffer, {
      headers: {
        'content-type': contentType,
      },
    })

    return response.formData()
  })
}

function streamToString(stream: Readable): Promise<string> {
  return streamToBuffer(stream).then(buffer => buffer.toString())
}

async function streamToFile(stream: Readable, fileName: string, contentType: string): Promise<File> {
  return streamToBuffer(stream).then(buffer => new File([buffer], fileName, { type: contentType }))
}

function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on('data', chunk => chunks.push(chunk))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

function nodeHttpResponseToAbortSignal(res: NodeHttpResponse): AbortSignal {
  const controller = new AbortController()
  res.on('close', () => {
    controller.abort()
  })

  return controller.signal
}
