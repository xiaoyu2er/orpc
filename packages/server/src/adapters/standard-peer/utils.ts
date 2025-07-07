import type { EncodedMessage, ServerPeer } from '@orpc/standard-server-peer'
import type { Context } from '../../context'
import type { FriendlyStandardHandleOptions, StandardHandler } from '../standard'
import { resolveFriendlyStandardHandleOptions } from '../standard'

export type experimental_HandleStandardServerPeerMessageOptions<T extends Context>
  = Omit<FriendlyStandardHandleOptions<T>, 'prefix'>

export async function experimental_handleStandardServerPeerMessage<T extends Context>(
  handler: StandardHandler<T>,
  peer: ServerPeer,
  message: EncodedMessage,
  options: experimental_HandleStandardServerPeerMessageOptions<T>,
): Promise<void> {
  const [id, request] = await peer.message(message)

  if (!request) {
    return
  }

  const { response } = await handler.handle(
    { ...request, body: () => Promise.resolve(request.body) },
    resolveFriendlyStandardHandleOptions(options),
  )

  await peer.response(id, response ?? { status: 404, headers: {}, body: 'No procedure matched' })
}
