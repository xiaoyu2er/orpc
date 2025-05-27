import type { APIGatewayEvent } from 'aws-lambda'
import type { APIGatewayProxyEvent } from './types'

it('APIGatewayProxyEvent', () => {
  expectTypeOf<APIGatewayEvent>().toExtend<APIGatewayProxyEvent>()
})
