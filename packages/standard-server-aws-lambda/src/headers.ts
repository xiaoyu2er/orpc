import type { StandardHeaders } from '@orpc/standard-server'
import type { APIGatewayProxyEventHeaders, APIGatewayProxyEventMultiValueHeaders } from 'aws-lambda'

export function toStandardHeaders(
  headers: APIGatewayProxyEventHeaders,
  multiValueHeaders: APIGatewayProxyEventMultiValueHeaders,
): StandardHeaders {
  return {
    ...headers,
    ...multiValueHeaders,
  }
}

export function toLambdaHeaders(standard: StandardHeaders): [headers: APIGatewayProxyEventHeaders, multiValueHeaders: APIGatewayProxyEventMultiValueHeaders] {
  const headers: APIGatewayProxyEventHeaders = {}
  const multiValueHeaders: APIGatewayProxyEventMultiValueHeaders = {}

  for (const [key, value] of Object.entries(standard)) {
    if (Array.isArray(value)) {
      multiValueHeaders[key] = value
    }
    else {
      headers[key] = value
    }
  }

  return [headers, multiValueHeaders]
}
