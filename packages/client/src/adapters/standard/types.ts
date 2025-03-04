import type { StandardLazyResponse, StandardRequest } from '@orpc/standard-server'
import type { ClientOptionsOut } from '../../types'

export interface StandardLinkCodec {
  encode(path: readonly string[], input: unknown, options: ClientOptionsOut<any>): Promise<StandardRequest>
  decode(response: StandardLazyResponse): Promise<unknown>
}

export interface StandardLinkClient {
  call(request: StandardRequest): Promise<StandardLazyResponse>
}
