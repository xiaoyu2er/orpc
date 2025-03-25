import type { Context, Router } from '@orpc/server'
import type { FetchHandlerOptions } from '@orpc/server/fetch'
import type { StandardOpenAPIHandlerOptions } from '../standard'
import { StandardBracketNotationSerializer, StandardOpenAPIJsonSerializer, StandardOpenAPISerializer } from '@orpc/openapi-client/standard'
import { FetchHandler } from '@orpc/server/fetch'
import { StandardHandler } from '@orpc/server/standard'
import { StandardOpenAPICodec, StandardOpenAPIMatcher } from '../standard'

export class OpenAPIHandler<T extends Context> extends FetchHandler<T> {
  constructor(router: Router<any, T>, options: NoInfer<StandardOpenAPIHandlerOptions<T> & FetchHandlerOptions<T>> = {}) {
    const jsonSerializer = new StandardOpenAPIJsonSerializer(options)
    const bracketNotationSerializer = new StandardBracketNotationSerializer()
    const serializer = new StandardOpenAPISerializer(jsonSerializer, bracketNotationSerializer)
    const matcher = new StandardOpenAPIMatcher()
    const codec = new StandardOpenAPICodec(serializer)

    super(new StandardHandler(router, matcher, codec, options), options)
  }
}
