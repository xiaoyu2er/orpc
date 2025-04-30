import type { MaybeOptionalOptions } from '@orpc/shared'
import type { Message, Peer } from 'crossws'
import type { Context } from '../../context'
import type { StandardHandler } from '../standard'
import type { FriendlyStandardHandleOptions } from '../standard/utils'
import { resolveMaybeOptionalOptions } from '@orpc/shared'
import { ServerPeer } from '@orpc/standard-server-peer'
import { resolveFriendlyStandardHandleOptions } from '../standard/utils'

export class experimental_CrosswsHandler<T extends Context> {
  private readonly peers: WeakMap<Peer, ServerPeer> = new WeakMap()

  constructor(
    private readonly standardHandler: StandardHandler<T>,
  ) {
  }

  async message(
    ws: Peer,
    message: Message,
    ...rest: MaybeOptionalOptions<Omit<FriendlyStandardHandleOptions<T>, 'prefix'>>
  ): Promise<void> {
    let peer = this.peers.get(ws)

    if (!peer) {
      this.peers.set(ws, peer = new ServerPeer(async (raw) => {
        if (raw instanceof Blob) {
          const buffer = await raw.arrayBuffer()
          ws.send(buffer)
        }
        else {
          ws.send(raw)
        }
      }))
    }

    const [id, request] = await peer.message(typeof message.rawData === 'string' ? message.rawData : message.uint8Array())

    if (!request) {
      return
    }

    const options = resolveFriendlyStandardHandleOptions(resolveMaybeOptionalOptions(rest))

    const { response } = await this.standardHandler.handle({ ...request, body: () => Promise.resolve(request.body) }, options)

    await peer.response(id, response ?? { status: 404, headers: {}, body: 'No procedure matched' })
  }

  close(ws: Peer): void {
    const server = this.peers.get(ws)

    if (server) {
      server.close()
      this.peers.delete(ws)
    }
  }
}
