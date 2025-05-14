import type { MaybeOptionalOptions } from '@orpc/shared'
import type { WebContents } from 'electron'
import type { Context } from '../../context'
import type { StandardHandler } from '../standard'
import type { FriendlyStandardHandleOptions } from '../standard/utils'
import { ORPC_HANDLER_CHANNEL } from '@orpc/client/electron-ipc'
import { resolveMaybeOptionalOptions } from '@orpc/shared'
import { ServerPeer } from '@orpc/standard-server-peer'
import { ipcMain } from 'electron'
import { resolveFriendlyStandardHandleOptions } from '../standard/utils'

export class experimental_ElectronIPCHandler<T extends Context> {
  #peers = new WeakMap<WebContents, ServerPeer>()

  constructor(
    private readonly standardHandler: StandardHandler<T>,
  ) {
  }

  upgrade(
    ...rest: MaybeOptionalOptions<Omit<FriendlyStandardHandleOptions<T>, 'prefix'>>
  ): void {
    ipcMain.on(ORPC_HANDLER_CHANNEL, async (event, message) => {
      let peer = this.#peers.get(event.sender)

      if (!peer) {
        this.#peers.set(event.sender, peer = new ServerPeer(async (raw) => {
          event.sender.send(ORPC_HANDLER_CHANNEL, raw instanceof Blob ? await raw.arrayBuffer() : raw)
        }))

        event.sender.on('destroyed', () => {
          peer?.close()
          this.#peers.delete(event.sender)
        })
      }

      const [id, request] = await peer.message(message)

      if (!request) {
        return
      }

      const options = resolveFriendlyStandardHandleOptions(resolveMaybeOptionalOptions(rest))

      const { response } = await this.standardHandler.handle({ ...request, body: () => Promise.resolve(request.body) }, options)

      await peer.response(id, response ?? { status: 404, headers: {}, body: 'No procedure matched' })
    })
  }
}
