import { os } from '@orpc/server'
import { RPCHandler } from '@orpc/server/fetch'
import {
  experimental_DurableEventIteratorBuilder as DurableEventIteratorBuilder,
  experimental_DurableEventIteratorHandlerPlugin as DurableEventIteratorHandlerPlugin,
  experimental_upgradeDurableEventIteratorRequest as upgradeDurableEventIteratorRequest,
} from '@orpc/durable-event-iterator'
import type { ChatRoom } from './dos/chat-room'
import * as z from 'zod'

const base = os.$context<{
  env: Env
}>()

export const router = {
  onMessage: base.handler(({ context }) => {
    const builder = new DurableEventIteratorBuilder<ChatRoom>({
      signingKey: 'key',
    })

    return builder.subscribe('chat-room')
  }),
  sendMessage: base
    .input(z.object({ message: z.string() }))
    .handler(async ({ context, input }) => {
      const id = context.env.CHAT_ROOM.idFromName('chat-room')
      const stub = context.env.CHAT_ROOM.get(id)

      await stub.publishMessage(input.message)
    }),
}

const handler = new RPCHandler(router, {
  plugins: [
    new DurableEventIteratorHandlerPlugin(),
  ],
})

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname === '/chat-room') {
      return upgradeDurableEventIteratorRequest(request, {
        signingKey: 'key',
        namespace: env.CHAT_ROOM,
      })
    }

    const { response } = await handler.handle(request, {
      context: {
        env,
      },
    })

    return response ?? new Response('Not Found', { status: 404 })
  },
} satisfies ExportedHandler<Env>

export { ChatRoom } from './dos/chat-room'
