import type { MaybeOptionalOptions } from '@orpc/shared'
import type { Message, Peer } from 'crossws'
import type { Context } from '../../context'
import type { StandardHandler } from '../standard'
import type { FriendlyStandardHandleOptions } from '../standard/utils'
import { resolveMaybeOptionalOptions } from '@orpc/shared'
import { ServerPeer } from '@orpc/standard-server-peer'
import { resolveFriendlyStandardHandleOptions } from '../standard/utils'

export class experimental_CrosswsHandler<T extends Context> {
  private readonly peers: WeakMap<Pick<Peer, 'send'>, ServerPeer> = new WeakMap()

  constructor(
    private readonly standardHandler: StandardHandler<T>,
  ) {
  }

  async message(
    ws: Pick<Peer, 'send'>,
    message: Pick<Message, 'rawData' | 'uint8Array'>,
    ...rest: MaybeOptionalOptions<Omit<FriendlyStandardHandleOptions<T>, 'prefix'>>
  ): Promise<void> {
    let peer = this.peers.get(ws)

    if (!peer) {
      this.peers.set(ws, peer = new ServerPeer((message) => {
        ws.send(message)
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

  close(ws: Pick<Peer, 'send'>): void {
    const server = this.peers.get(ws)

    if (server) {
      server.close()
      this.peers.delete(ws)
    }
  }
}
