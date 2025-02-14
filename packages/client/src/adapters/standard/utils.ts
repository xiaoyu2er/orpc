export type EventSourceConnectionStatus = 'reconnecting' | 'connected' | 'closed'

const INTERNAL_STATE_SYMBOL = Symbol('ORPC_INTERNAL_EVENT_SOURCE_STATE')

type InternalState = {
  status: EventSourceConnectionStatus
  listeners: Array<(newStatus: EventSourceConnectionStatus) => void>
}

export function listenableEventSource<T extends AsyncIteratorObject<unknown, unknown, void>>(iterator: T): T {
  const internalState: InternalState = {
    status: 'closed',
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

export function changeEventSourceConnectionStatus(
  iterator: AsyncIteratorObject<unknown, unknown, void>,
  status: EventSourceConnectionStatus,
): void {
  const state = Reflect.get(iterator, INTERNAL_STATE_SYMBOL) as InternalState | undefined

  if (!state) {
    throw new Error('Iterator is not listenable')
  }

  if (state) {
    state.status = status
    state.listeners.forEach(cb => cb(status))
  }
}

export function listenOnEventSourceConnectionStatus(
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
