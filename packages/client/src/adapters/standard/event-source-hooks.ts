export type EventSourceConnectionStatus = 'reconnecting' | 'connected' | 'closed'

const INTERNAL_STATE_SYMBOL = Symbol('ORPC_INTERNAL_EVENT_SOURCE_STATE')

type InternalState = {
  status: EventSourceConnectionStatus
  listeners: Array<(newStatus: EventSourceConnectionStatus) => void>
}

export function createListenableEventSourceIterator<T extends AsyncIteratorObject<unknown, unknown, void>>(iterator: T): T {
  const internalState: InternalState = {
    status: 'connected',
    listeners: [],
  }

  const proxyIterator = new Proxy(iterator, {
    get(target, prop, receiver) {
      if (prop === INTERNAL_STATE_SYMBOL) {
        return internalState
      }

      return Reflect.get(target, prop, receiver)
    },
  })

  return proxyIterator
}

export function setEventSourceIteratorStatus(
  iterator: AsyncIteratorObject<unknown, unknown, void>,
  status: EventSourceConnectionStatus,
): void {
  const state = Reflect.get(iterator, INTERNAL_STATE_SYMBOL) as InternalState | undefined

  if (!state) {
    throw new Error('Iterator is not listenable')
  }

  if (state.status !== status) {
    state.status = status
    state.listeners.forEach(cb => cb(status))
  }
}

export function onEventSourceIteratorStatusChange(
  iterator: AsyncIteratorObject<unknown, unknown, void>,
  callback: (value: EventSourceConnectionStatus) => void,
): () => void {
  const state = Reflect.get(iterator, INTERNAL_STATE_SYMBOL) as InternalState | undefined

  if (!state) {
    throw new Error('Iterator is not listenable')
  }

  state.listeners.push(callback)

  return () => {
    const index = state.listeners.indexOf(callback)

    if (index !== -1) {
      state.listeners.splice(index, 1)
    }
  }
}
