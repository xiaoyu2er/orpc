import type { MaybeOptionalOptions } from '@orpc/shared'
import type { Context } from '../../context'
import type { StandardHandler } from '../standard'
import type { FriendlyStandardHandleOptions } from '../standard/utils'
import { resolveMaybeOptionalOptions } from '@orpc/shared'
import { ServerPeer } from '@orpc/standard-server-peer'
import { resolveFriendlyStandardHandleOptions } from '../standard/utils'

export class experimental_WebsocketHandler<T extends Context> {
  constructor(
    private readonly standardHandler: StandardHandler<T>,
  ) {
  }

  handle(ws: Pick<WebSocket, 'addEventListener' | 'send'>, ...rest: MaybeOptionalOptions<Omit<FriendlyStandardHandleOptions<T>, 'prefix'>>): void {
    const peer = new ServerPeer(ws.send.bind(ws))

    ws.addEventListener('message', async (event) => {
      const [id, request] = await peer.message(event.data)

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
