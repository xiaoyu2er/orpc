import type { ClientContext } from '../../types'
import type { StandardRPCLinkOptions } from '../standard'
import type { experimental_LinkWebsocketClientOptions as LinkWebsocketClientOptions } from './link-websocket-client'
import { StandardRPCLink } from '../standard'
import { experimental_LinkWebsocketClient as LinkWebsocketClient } from './link-websocket-client'

export interface experimental_RPCLinkOptions<T extends ClientContext>
  extends Omit<StandardRPCLinkOptions<T>, 'url' | 'headers' | 'method' | 'fallbackMethod' | 'maxUrlLength'>, LinkWebsocketClientOptions {}

/**
 * The RPC Link communicates with the server using the RPC protocol over WebSocket.
 *
 * @see {@link https://orpc.unnoq.com/docs/client/rpc-link RPC Link Docs}
 * @see {@link https://orpc.unnoq.com/docs/adapters/websocket WebSocket Adapter Docs}
 */
export class experimental_RPCLink<T extends ClientContext> extends StandardRPCLink<T> {
  constructor(options: experimental_RPCLinkOptions<T>) {
    const linkClient = new LinkWebsocketClient(options)

    super(linkClient, { ...options, url: 'orpc:/' })
  }
}
