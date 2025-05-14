import type { StandardLazyResponse, StandardRequest } from '@orpc/standard-server'
import type { ClientContext, ClientOptions } from '../../types'
import type { StandardLinkClient } from '../standard'
import type { ExposedORPCHandlerChannel } from './types'
import { ClientPeer } from '@orpc/standard-server-peer'
import { ORPC_HANDLER_CHANNEL } from './consts'

export class experimental_LinkElectronIPCClient<T extends ClientContext> implements StandardLinkClient<T> {
  private readonly peer: ClientPeer

  constructor() {
    const exposed: ExposedORPCHandlerChannel = (window as any)[ORPC_HANDLER_CHANNEL]

    this.peer = new ClientPeer(async (message) => {
      exposed.send(message instanceof Blob ? await message.arrayBuffer() : message)
    })

    exposed.receive((message) => {
      this.peer.message(message)
    })
  }

  async call(request: StandardRequest, _options: ClientOptions<T>, _path: readonly string[], _input: unknown): Promise<StandardLazyResponse> {
    const response = await this.peer.request(request)
    return { ...response, body: () => Promise.resolve(response.body) }
  }
}
