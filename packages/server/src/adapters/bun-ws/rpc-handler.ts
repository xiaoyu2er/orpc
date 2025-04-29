import type { MaybeOptionalOptions } from '@orpc/shared'
import type { Context } from '../../context'
import type { FriendlyStandardHandleOptions } from '../standard/utils'
import type { ServerWebSocket } from '../websocket'
import { experimental_RPCHandler as WebsocketRPCHandler } from '../websocket'

/**
 * RPC Handler for Bun Websocket
 *
 * @see {@link https://orpc.unnoq.com/docs/rpc-handler RPC Handler Docs}
 * @see {@link https://orpc.unnoq.com/docs/integrations/websocket Websocket Integration Docs}
 */
export class experimental_RPCHandler<T extends Context> {
  private readonly wsHandler: WebsocketRPCHandler<T>

  constructor(...args: ConstructorParameters<typeof WebsocketRPCHandler<T>>) {
    this.wsHandler = new WebsocketRPCHandler(...args)
  }

  message(ws: ServerWebSocket, message: string | { buffer: ArrayBufferLike }, ...rest: MaybeOptionalOptions<Omit<FriendlyStandardHandleOptions<T>, 'prefix'>>): Promise<{ matched: boolean }> {
    return this.wsHandler.message(ws, typeof message === 'string' ? message : message.buffer, ...rest)
  }

  close(peer: ServerWebSocket): void {
    this.wsHandler.close(peer)
  }
}
