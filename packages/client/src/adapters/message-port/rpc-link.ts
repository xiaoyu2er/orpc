import type { ClientContext } from '../../types'
import type { StandardRPCLinkOptions } from '../standard'
import type { experimental_LinkMessagePortClientOptions } from './link-client'
import { StandardRPCLink } from '../standard'
import { experimental_LinkMessagePortClient as LinkMessagePortClient } from './link-client'

export interface experimental_RPCLinkOptions<T extends ClientContext>
  extends Omit<StandardRPCLinkOptions<T>, 'url' | 'headers' | 'method' | 'fallbackMethod' | 'maxUrlLength'>, experimental_LinkMessagePortClientOptions {}

/**
 * The RPC Link for common message port implementations.
 *
 * @see {@link https://orpc.unnoq.com/docs/client/rpc-link RPC Link Docs}
 * @see {@link https://orpc.unnoq.com/docs/adapters/message-port Message Port Adapter Docs}
 */
export class experimental_RPCLink<T extends ClientContext> extends StandardRPCLink<T> {
  constructor(options: experimental_RPCLinkOptions<T>) {
    const linkClient = new LinkMessagePortClient(options)
    super(linkClient, { ...options, url: 'orpc:/' })
  }
}
