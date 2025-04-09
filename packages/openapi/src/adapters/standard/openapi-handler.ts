import type { Context, Router } from '@orpc/server'
import { StandardBracketNotationSerializer, StandardOpenAPIJsonSerializer, type StandardOpenAPIJsonSerializerOptions, StandardOpenAPISerializer } from '@orpc/openapi-client/standard'
import { StandardHandler, type StandardHandlerOptions } from '@orpc/server/standard'
import { StandardOpenAPICodec } from './openapi-codec'
import { StandardOpenAPIMatcher } from './openapi-matcher'

export interface StandardOpenAPIHandlerOptions<T extends Context>
  extends StandardHandlerOptions<T>, StandardOpenAPIJsonSerializerOptions {}

export class StandardOpenAPIHandler<T extends Context> extends StandardHandler<T> {
  constructor(router: Router<any, T>, options: NoInfer<StandardOpenAPIHandlerOptions<T>>) {
    const jsonSerializer = new StandardOpenAPIJsonSerializer(options)
    const bracketNotationSerializer = new StandardBracketNotationSerializer()
    const serializer = new StandardOpenAPISerializer(jsonSerializer, bracketNotationSerializer)
    const matcher = new StandardOpenAPIMatcher()
    const codec = new StandardOpenAPICodec(serializer)

    super(router, matcher, codec, options)
  }
}
