import type { StandardLazyResponse, StandardRequest } from '@orpc/standard-server'
import type { ClientContext, ClientOptions } from '../../types'
import type { StandardLinkClient } from '../standard'
import { ClientPeer } from '@orpc/standard-server-peer'

export interface experimental_LinkWebsocketClientOptions {
  websocket: Pick<WebSocket, 'addEventListener' | 'send'>
}

export class experimental_LinkWebsocketClient<T extends ClientContext> implements StandardLinkClient<T> {
  private readonly peer: ClientPeer

  constructor(options: experimental_LinkWebsocketClientOptions) {
    this.peer = new ClientPeer(options.websocket.send.bind(options.websocket))

    options.websocket.addEventListener('message', (event) => {
      if (event.data instanceof Blob) {
        event.data.arrayBuffer().then(this.peer.message.bind(this.peer))
      }
      else {
        this.peer.message(event.data)
      }
    })

    options.websocket.addEventListener('close', () => {
      this.peer.close()
    })
  }

  async call(request: StandardRequest, _options: ClientOptions<T>, _path: readonly string[], _input: unknown): Promise<StandardLazyResponse> {
    const response = await this.peer.request(request)
    return { ...response, body: () => Promise.resolve(response.body) }
  }
}
