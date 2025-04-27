import type { StandardLazyResponse, StandardRequest } from '@orpc/standard-server'
import type { ClientContext, ClientOptions } from '../../types'
import type { StandardLinkClient } from '../standard'
import { MessageClient } from '@orpc/standard-server-messages'

export interface LinkWebsocketClientOptions {
  websocket: WebSocket
}

export class LinkWebsocketClient<T extends ClientContext> implements StandardLinkClient<T> {
  private readonly client: MessageClient

  constructor(options: LinkWebsocketClientOptions) {
    this.client = new MessageClient(options.websocket.send.bind(options.websocket))

    options.websocket.addEventListener('message', (event) => {
      this.client.message(event.data)
    })

    options.websocket.addEventListener('close', () => {
      this.client.close()
    })
  }

  async call(request: StandardRequest, _options: ClientOptions<T>, _path: readonly string[], _input: unknown): Promise<StandardLazyResponse> {
    const response = await this.client.request(request)
    return { ...response, body: () => Promise.resolve(response.body) }
  }
}
