import type { PullableAsyncIdQueue } from './queue'

export function toAbortSignal(queue: PullableAsyncIdQueue<void>, id: number): AbortSignal {
  const controller = new AbortController()

  queue.pull(id)
    .then(() => {
      controller.abort()
    })
    .catch(() => {})

  return controller.signal
}
