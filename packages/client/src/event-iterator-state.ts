export type ConnectionStatus = 'reconnecting' | 'connected' | 'closed'

export interface EventIteratorState {
  status: ConnectionStatus
  listeners: Array<(newStatus: ConnectionStatus) => void>
}

const iteratorStates = new WeakMap<AsyncIteratorObject<unknown, unknown, void>, EventIteratorState>()

export function registerEventIteratorState(
  iterator: AsyncIteratorObject<unknown, unknown, void>,
  state: EventIteratorState,
): void {
  iteratorStates.set(iterator, state)
}

export function updateEventIteratorStatus(
  state: EventIteratorState,
  status: ConnectionStatus,
): void {
  if (state.status !== status) {
    state.status = status
    state.listeners.forEach(cb => cb(status))
  }
}

export function onEventIteratorStatusChange(
  iterator: AsyncIteratorObject<unknown, unknown, void>,
  callback: (status: ConnectionStatus) => void,
  options: { notifyImmediately?: boolean } = {},
): () => void {
  const notifyImmediately = options.notifyImmediately ?? true

  const state = iteratorStates.get(iterator)

  if (!state) {
    throw new Error('Iterator is not registered.')
  }

  if (notifyImmediately) {
    callback(state.status)
  }

  state.listeners.push(callback)

  return () => {
    const index = state.listeners.indexOf(callback)
    if (index !== -1) {
      state.listeners.splice(index, 1)
    }
  }
}
