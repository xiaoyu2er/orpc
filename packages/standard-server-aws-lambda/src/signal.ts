import type Stream from 'node:stream'

export function toAbortSignal(
  responseStream: Stream.Writable,
): AbortSignal {
  const controller = new AbortController()

  responseStream.once('close', () => {
    if (responseStream.errored) {
      controller.abort(responseStream.errored.toString())
    }

    else if (!responseStream.writableFinished) {
      controller.abort('Client connection prematurely closed.')
    }

    // Not abort if success
  })

  return controller.signal
}
