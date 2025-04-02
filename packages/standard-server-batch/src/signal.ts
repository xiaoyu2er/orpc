export function toBatchAbortSignal(signals: readonly (AbortSignal | undefined)[]): AbortSignal {
  const controller = new AbortController()

  const abortedSignals = signals.filter(signal => signal.aborted)

  if (abortedSignals.length > 0) {
    controller.abort()
  }

  signals.forEach(signal => signal.addEventListener('abort', () => controller.abort()))

  return controller.signal
}
