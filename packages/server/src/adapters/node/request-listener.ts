// this file mainly copy from https://github.com/mjackson/remix-the-web/blob/main/packages/node-fetch-server/src/lib/request-listener.ts
// with modification make it work with Express.js middleware (use `req.originalUrl` instead of `req.url`)

import type { IncomingMessage, ServerResponse } from 'node:http'

export interface ExpressableIncomingMessage extends IncomingMessage {
  originalUrl?: string
}

/**
 * Creates a [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request) object from a Node.js
 * [`IncomingMessage`](https://nodejs.org/api/http.html#class-httpincomingmessage) and
 * [`http.ServerResponse`](https://nodejs.org/api/http.html#class-httpserverresponse) pair.
 *
 */
export function createRequest(req: ExpressableIncomingMessage, res: ServerResponse): Request {
  const controller = new AbortController()
  res.on('close', () => {
    controller.abort()
  })

  const method = req.method ?? 'GET'
  const headers = createHeaders(req)

  const protocol = ('encrypted' in req.socket && req.socket.encrypted ? 'https:' : 'http:')
  const host = headers.get('Host') ?? 'localhost'
  const url = new URL(req.originalUrl ?? req.url ?? '/', `${protocol}//${host}`)

  const init: RequestInit = { method, headers, signal: controller.signal }

  if (method !== 'GET' && method !== 'HEAD') {
    init.body = new ReadableStream({
      start(controller) {
        req.on('data', (chunk) => {
          controller.enqueue(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength))
        })
        req.on('end', () => {
          controller.close()
        })
      },
    });

    // init.duplex = 'half' must be set when body is a ReadableStream, and Node follows the spec.
    // However, this property is not defined in the TypeScript types for RequestInit, so we have
    // to cast it here in order to set it without a type error.
    // See https://fetch.spec.whatwg.org/#dom-requestinit-duplex
    (init as { duplex: 'half' }).duplex = 'half'
  }

  return new Request(url, init)
}

/**
 * Creates a [`Headers`](https://developer.mozilla.org/en-US/docs/Web/API/Headers) object from the headers
 * in a Node.js [`IncomingMessage`](https://nodejs.org/api/http.html#class-httpincomingmessage).
 *
 * @param req The incoming request object.
 * @returns A headers object.
 */
export function createHeaders(req: IncomingMessage): Headers {
  const headers = new Headers()

  const rawHeaders = req.rawHeaders
  for (let i = 0; i < rawHeaders.length; i += 2) {
    headers.append(rawHeaders[i]!, rawHeaders[i + 1]!)
  }

  return headers
}

/**
 * Sends a [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response) to the client using the
 * Node.js [`http.ServerResponse`](https://nodejs.org/api/http.html#class-httpserverresponse) object.
 *
 * @param res The server response object.
 * @param response The response to send.
 */
export async function sendResponse(res: ServerResponse, response: Response): Promise<void> {
  // Iterate over response.headers so we are sure to send multiple Set-Cookie headers correctly.
  // These would incorrectly be merged into a single header if we tried to use
  // `Object.fromEntries(response.headers.entries())`.
  const headers: Record<string, string | string[]> = {}
  for (const [key, value] of response.headers as any) {
    if (key in headers) {
      if (Array.isArray(headers[key])) {
        headers[key].push(value)
      }
      else {
        headers[key] = [headers[key] as string, value]
      }
    }
    else {
      headers[key] = value
    }
  }

  res.writeHead(response.status, headers)

  if (response.body != null && res.req.method !== 'HEAD') {
    for await (const chunk of response.body as any) {
      res.write(chunk)
    }
  }

  res.end()
}
