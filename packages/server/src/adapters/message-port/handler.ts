import type { SupportedMessagePort } from '@orpc/client/message-port'
import type { MaybeOptionalOptions } from '@orpc/shared'
import type { Context } from '../../context'
import type { StandardHandler } from '../standard'
import type { FriendlyStandardHandleOptions } from '../standard/utils'
import { onMessagePortClose, onMessagePortMessage } from '@orpc/client/message-port'
import { resolveMaybeOptionalOptions } from '@orpc/shared'
import { ServerPeer } from '@orpc/standard-server-peer'
import { resolveFriendlyStandardHandleOptions } from '../standard/utils'

export class experimental_MessagePortHandler<T extends Context> {
  constructor(
    private readonly standardHandler: StandardHandler<T>,
  ) {
  }

  upgrade(port: SupportedMessagePort, ...rest: MaybeOptionalOptions<Omit<FriendlyStandardHandleOptions<T>, 'prefix'>>): void {
    const peer = new ServerPeer(async (message) => {
      port.postMessage(message instanceof Blob ? await message.arrayBuffer() : message)
    })

    onMessagePortMessage(port, (message) => {
      peer.message(message).then(async ([id, request]) => {
        if (!request) {
          return
        }

        const options = resolveFriendlyStandardHandleOptions(resolveMaybeOptionalOptions(rest))

        const { response } = await this.standardHandler.handle({ ...request, body: () => Promise.resolve(request.body) }, options)

        await peer.response(id, response ?? { status: 404, headers: {}, body: 'No procedure matched' })
      })
    })

    onMessagePortClose(port, () => {
      peer.close()
    })
  }
}
