import type { APIGatewayProxyEvent } from './types'

export function toStandardUrl(event: APIGatewayProxyEvent): URL {
  const host = event.requestContext.domainName ?? event.headers.host ?? event.multiValueHeaders.host?.[0] ?? 'localhost'
  const url = new URL(`https://${host}${event.path}`)

  if (event.queryStringParameters) {
    for (const key in event.queryStringParameters) {
      const value = event.queryStringParameters[key]
      if (typeof value === 'string') {
        url.searchParams.append(key, value)
      }
    }
  }

  if (event.multiValueQueryStringParameters) {
    for (const key in event.multiValueQueryStringParameters) {
      const value = event.multiValueQueryStringParameters[key]
      if (value) {
        for (const v of value) {
          url.searchParams.append(key, v)
        }
      }
    }
  }

  return url
}
