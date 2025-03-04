import type { StandardLazyResponse, StandardRequest } from '@orpc/standard-server'
import type { ClientContext, ClientOptionsOut } from '../../types'

export interface StandardLinkCodec<T extends ClientContext> {
  encode(path: readonly string[], input: unknown, options: ClientOptionsOut<any>): Promise<StandardRequest>
  decode(response: StandardLazyResponse, options: ClientOptionsOut<T>, path: readonly string[], input: unknown): Promise<unknown>
}

export interface StandardLinkClient<T extends ClientContext> {
  call(request: StandardRequest, options: ClientOptionsOut<T>, path: readonly string[], input: unknown): Promise<StandardLazyResponse>
}
