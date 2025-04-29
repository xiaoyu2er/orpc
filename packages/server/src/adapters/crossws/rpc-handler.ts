import type { Context } from '../../context'
import type { Router } from '../../router'
import type { StandardRPCHandlerOptions } from '../standard'
import { StandardRPCHandler } from '../standard'
import { experimental_CrosswsHandler } from './handler'

/**
 * RPC Handler for Crossws
 *
 * @see {@link https://orpc.unnoq.com/docs/rpc-handler RPC Handler Docs}
 * @see {@link https://orpc.unnoq.com/docs/integrations/websocket Websocket Integration Docs}
 */
export class experimental_RPCHandler<T extends Context> extends experimental_CrosswsHandler<T> {
  constructor(router: Router<any, T>, options: NoInfer<Omit<StandardRPCHandlerOptions<T>, 'strictGetMethodPluginEnabled'>> = {}) {
    super(new StandardRPCHandler(router, { ...options, strictGetMethodPluginEnabled: false }))
  }
}
