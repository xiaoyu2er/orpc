import type { MaybeOptionalOptions } from '@orpc/shared'
import type { WebSocket } from 'ws'
import type { Context } from '../../context'
import type { StandardHandler } from '../standard'
import type { FriendlyStandardHandleOptions } from '../standard/utils'
import { resolveMaybeOptionalOptions } from '@orpc/shared'
import { ServerPeer } from '@orpc/standard-server-peer'

import { resolveFriendlyStandardHandleOptions } from '../standard/utils'

export class experimental_WsHandler<T extends Context> {
  constructor(
    private readonly standardHandler: StandardHandler<T>,
  ) {
  }

  async upgrade(ws: Pick<WebSocket, 'addEventListener' | 'send'>, ...rest: MaybeOptionalOptions<Omit<FriendlyStandardHandleOptions<T>, 'prefix'>>): Promise<void> {
    const peer = new ServerPeer(ws.send.bind(ws))

    ws.addEventListener('message', async (event) => {
      const message = Array.isArray(event.data)
        ? await (new Blob(event.data)).arrayBuffer()
        : event.data

      const [id, request] = await peer.message(message)

      if (!request) {
        return
      }

      const options = resolveFriendlyStandardHandleOptions(resolveMaybeOptionalOptions(rest))

      const { response } = await this.standardHandler.handle({ ...request, body: () => Promise.resolve(request.body) }, options)

      await peer.response(id, response ?? { status: 404, headers: {}, body: 'No procedure matched' })
    })

    ws.addEventListener('close', () => {
      peer.close()
    })
  }
}
