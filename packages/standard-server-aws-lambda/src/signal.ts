import type Stream from 'node:stream'

export function toAbortSignal(
  responseStream: Stream.Writable,
): AbortSignal {
  const controller = new AbortController()

  responseStream.once('error', error => controller.abort(error))

  responseStream.once('close', () => {
    if (!responseStream.writableFinished) {
      controller.abort(new Error('Writable stream closed before it finished writing'))
    }
  })

  return controller.signal
}
