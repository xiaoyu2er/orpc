import type { ClientContext } from '../../types'
import type { StandardRPCLinkOptions } from '../standard'
import type { LinkWebsocketClientOptions } from './link-websocket-client'
import { StandardRPCLink } from '../standard'
import { LinkWebsocketClient } from './link-websocket-client'

export interface RPCLinkOptions<T extends ClientContext>
  extends Omit<StandardRPCLinkOptions<T>, 'url'>, LinkWebsocketClientOptions {}

export class RPCLink<T extends ClientContext> extends StandardRPCLink<T> {
  constructor(options: RPCLinkOptions<T>) {
    const linkClient = new LinkWebsocketClient(options)

    super(linkClient, { ...options, url: 'orpc:/' })
  }
}
