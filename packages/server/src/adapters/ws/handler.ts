import type { MaybeOptionalOptions } from '@orpc/shared'
import type { WebSocket } from 'ws'
import type { Context } from '../../context'
import type { StandardHandler } from '../standard'
import type {
  experimental_HandleStandardServerPeerMessageOptions as HandleStandardServerPeerMessageOptions,
} from '../standard-peer'
import { blobToBuffer, resolveMaybeOptionalOptions } from '@orpc/shared'
import { ServerPeer } from '@orpc/standard-server-peer'
import {
  experimental_handleStandardServerPeerMessage as handleStandardServerPeerMessage,
} from '../standard-peer'

export class experimental_WsHandler<T extends Context> {
  constructor(
    private readonly standardHandler: StandardHandler<T>,
  ) {
  }

  async upgrade(
    ws: Pick<WebSocket, 'addEventListener' | 'send'>,
    ...rest: MaybeOptionalOptions<HandleStandardServerPeerMessageOptions<T>>
  ): Promise<void> {
    const peer = new ServerPeer(ws.send.bind(ws))

    ws.addEventListener('message', async (event) => {
      const message = Array.isArray(event.data)
        ? await blobToBuffer(new Blob(event.data))
        : event.data

      await handleStandardServerPeerMessage(
        this.standardHandler,
        peer,
        message,
        resolveMaybeOptionalOptions(rest),
      )
    })

    ws.addEventListener('close', () => {
      peer.close()
    })
  }
}
