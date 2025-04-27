import type { Context } from '../../context'
import type { Router } from '../../router'
import type { StandardRPCHandlerOptions } from '../standard'
import { StandardRPCHandler } from '../standard'
import { experimental_CrosswsHandler } from './handler'

export class experimental_RPCHandler<T extends Context> extends experimental_CrosswsHandler<T> {
  constructor(router: Router<any, T>, options: NoInfer<StandardRPCHandlerOptions<T>> = {}) {
    super(new StandardRPCHandler(router, options))
  }
}
