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
  ): Promise<{ matched: boolean }> {
    let peer = this.peers.get(ws)

    if (!peer) {
      peer = new ServerPeer(
        message => ws.send(message),
      )

      this.peers.set(ws, peer)
    }

    const [id, request] = await peer.message(typeof message.rawData === 'string' ? message.rawData : message.uint8Array())

    if (!request) {
      return { matched: true }
    }

    const options = resolveFriendlyStandardHandleOptions(resolveMaybeOptionalOptions(rest))

    const { response } = await this.standardHandler.handle({ ...request, body: () => Promise.resolve(request.body) }, options)

    await peer.response(id, response ?? { status: 404, headers: {}, body: 'No procedure matched' })

    return { matched: true }
  }

  close(peer: Peer): void {
    const server = this.peers.get(peer)

    if (server) {
      server.close()
      this.peers.delete(peer)
    }
  }
}
