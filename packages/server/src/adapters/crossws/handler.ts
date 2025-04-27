import type { MaybeOptionalOptions } from '@orpc/shared'
import type { Message, Peer } from 'crossws'
import type { Context } from '../../context'
import type { StandardHandler } from '../standard'
import type { FriendlyStandardHandleOptions } from '../standard/utils'
import { resolveMaybeOptionalOptions } from '@orpc/shared'
import { MessageServer } from '@orpc/standard-server-messages'
import { resolveFriendlyStandardHandleOptions } from '../standard/utils'

export class CrosswsHandler<T extends Context> {
  private readonly peers: WeakMap<Peer, MessageServer> = new WeakMap()

  constructor(
    private readonly standardHandler: StandardHandler<T>,
  ) {
  }

  async handle(
    peer: Peer,
    message: Message,
    ...rest: MaybeOptionalOptions<Omit<FriendlyStandardHandleOptions<T>, 'prefix'>>
  ): Promise<{ matched: boolean }> {
    let server = this.peers.get(peer)

    if (!server) {
      server = new MessageServer(
        message => peer.send(message),
      )

      this.peers.set(peer, server)
    }

    const [id, request] = await server.message(typeof message.rawData === 'string' ? message.rawData : message.uint8Array())

    if (!request) {
      return { matched: true }
    }

    const options = resolveFriendlyStandardHandleOptions(resolveMaybeOptionalOptions(rest))

    const { response } = await this.standardHandler.handle({ ...request, body: () => Promise.resolve(request.body) }, options)

    await server.response(id, response ?? { status: 404, headers: {}, body: 'No procedure matched' })

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
