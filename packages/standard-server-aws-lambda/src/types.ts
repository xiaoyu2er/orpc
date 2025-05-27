// this is mainly copied from aws-lambda

export interface APIGatewayProxyEventHeaders {
  [name: string]: string | undefined
}

export interface APIGatewayProxyEventMultiValueHeaders {
  [name: string]: string[] | undefined
}

export interface APIGatewayProxyEventPathParameters {
  [name: string]: string | undefined
}

export interface APIGatewayProxyEventQueryStringParameters {
  [name: string]: string | undefined
}

export interface APIGatewayProxyEventMultiValueQueryStringParameters {
  [name: string]: string[] | undefined
}

export interface APIGatewayProxyEventStageVariables {
  [name: string]: string | undefined
}

export interface APIGatewayProxyEvent {
  body: string | null
  headers: APIGatewayProxyEventHeaders
  multiValueHeaders: APIGatewayProxyEventMultiValueHeaders
  httpMethod: string
  isBase64Encoded: boolean
  path: string
  pathParameters: APIGatewayProxyEventPathParameters | null
  queryStringParameters: APIGatewayProxyEventQueryStringParameters | null
  multiValueQueryStringParameters: APIGatewayProxyEventMultiValueQueryStringParameters | null
  stageVariables: APIGatewayProxyEventStageVariables | null
  requestContext: {
    domainName?: string | undefined
  }
  resource: string
}
