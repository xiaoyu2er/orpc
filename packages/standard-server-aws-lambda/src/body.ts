import type { StandardBody } from '@orpc/standard-server'
import type { APIGatewayEvent } from 'aws-lambda'
import { Buffer } from 'node:buffer'
import { parseEmptyableJSON } from '@orpc/shared'
import { flattenHeader, getFilenameFromContentDisposition } from '@orpc/standard-server'
import { toEventIterator } from './event-iterator'

export async function toStandardBody(event: APIGatewayEvent): Promise<StandardBody> {
  if (event.httpMethod === 'GET' || event.httpMethod === 'HEAD' || event.body === null) {
    return undefined
  }

  const contentType = event.headers['content-type'] ?? flattenHeader(event.multiValueHeaders['content-type'])
  const contentDisposition = event.headers['content-disposition'] ?? flattenHeader(event.multiValueHeaders['content-disposition'])

  if (typeof contentDisposition === 'string') {
    const fileName = getFilenameFromContentDisposition(contentDisposition) ?? 'blob'

    return _parseAsFile(event.body, event.isBase64Encoded, fileName, contentType ?? '')
  }

  if (!contentType || contentType.startsWith('application/json')) {
    const text = _parseAsString(event.body, event.isBase64Encoded)
    return parseEmptyableJSON(text)
  }

  if (contentType.startsWith('multipart/form-data')) {
    return _parseAsFormData(event.body, event.isBase64Encoded, contentType)
  }

  if (contentType.startsWith('application/x-www-form-urlencoded')) {
    const text = _parseAsString(event.body, event.isBase64Encoded)
    return new URLSearchParams(text)
  }

  if (contentType.startsWith('text/event-stream')) {
    return toEventIterator(_parseAsString(event.body, event.isBase64Encoded))
  }

  if (contentType.startsWith('text/plain')) {
    return _parseAsString(event.body, event.isBase64Encoded)
  }

  return _parseAsFile(event.body, event.isBase64Encoded, 'blob', contentType)
}

function _parseAsFile(body: string, isBase64Encoded: boolean, fileName: string, contentType: string): File {
  const blobPart = isBase64Encoded ? Buffer.from(body, 'base64') : body
  return new File([blobPart], fileName, { type: contentType })
}

function _parseAsString(body: string, isBase64Encoded: boolean): string {
  return isBase64Encoded ? Buffer.from(body, 'base64').toString() : body
}

function _parseAsFormData(body: string, isBase64Encoded: boolean, contentType: string): Promise<FormData> {
  const blobPart = isBase64Encoded ? Buffer.from(body, 'base64') : body
  const response = new Response(blobPart, {
    headers: {
      'content-type': contentType,
    },
  })

  return response.formData()
}
