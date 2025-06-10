export default {
  fetch(request, env) {
    if (request.url.endsWith('/chat-room')) {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('Durable Object expected Upgrade: websocket', {
          status: 426,
        })
      }

      const id = env.CHAT_ROOM.idFromName('foo')
      const stub = env.CHAT_ROOM.get(id)

      return stub.fetch(request)
    }

    return new Response('Not found', { status: 404 })
  },
} satisfies ExportedHandler<Env>

export { ChatRoom } from './dos/chat-room'
