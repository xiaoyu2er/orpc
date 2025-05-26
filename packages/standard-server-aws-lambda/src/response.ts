import type { StandardResponse } from '@orpc/standard-server'
import type Stream from 'node:stream'
import type { ToLambdaBodyOptions } from './body'
import { toLambdaBody } from './body'
import { toLambdaHeaders } from './headers'

export interface SendStandardResponseOptions extends ToLambdaBodyOptions {}

export function sendStandardResponse(
  responseStream: Stream.Writable,
  standardResponse: StandardResponse,
  options: SendStandardResponseOptions = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    const [body, standardHeaders] = toLambdaBody(standardResponse.body, standardResponse.headers, options)
    const [headers, cookies] = toLambdaHeaders(standardHeaders)

    responseStream = awslambda.HttpResponseStream.from(responseStream, {
      statusCode: standardResponse.status,
      headers,
      cookies,
    })

    responseStream.on('close', () => {
      if (responseStream.errored) {
        reject(responseStream.errored)
      }
      else {
        resolve()
      }
    })

    if (body === undefined || typeof body === 'string') {
      responseStream.end(body)
    }
    else {
      responseStream.on('close', () => {
        if (!body.closed) {
          body.destroy(responseStream.errored ?? undefined)
        }
      })

      body.pipe(responseStream)
    }
  })
}
