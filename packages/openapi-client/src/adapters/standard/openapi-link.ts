import type { ClientContext } from '@orpc/client'
import type { StandardLinkOptions } from '@orpc/client/standard'
import type { StandardOpenAPIJsonSerializerOptions } from './openapi-json-serializer'
import type { StandardOpenapiLinkCodecOptions } from './openapi-link-codec'

export interface StandardOpenAPILinkOptions<T extends ClientContext>
  extends StandardLinkOptions<T>, StandardOpenapiLinkCodecOptions<T>, StandardOpenAPIJsonSerializerOptions {}
