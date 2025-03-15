import { os } from '@orpc/server'

const MAX_EVENTS = 5

export const sse = os
  .route({
    method: 'GET',
    path: '/sse',
    tags: ['SSE'],
    summary: 'Server-Sent Events',
  })
  .handler(async function* () {
    let count = 0

    while (count < MAX_EVENTS) {
      count++
      yield { time: Date }
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  })
