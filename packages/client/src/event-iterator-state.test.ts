import type {
  EventIteratorState,
} from './event-iterator-state'
import {
  onEventIteratorStatusChange,
  registerEventIteratorState,
  updateEventIteratorStatus,
} from './event-iterator-state'

describe('eventIterator Status Management', () => {
  // A dummy object to act as our iterator.
  let dummyIterator: any
  let initialState: EventIteratorState

  beforeEach(() => {
    // Create a dummy iterator object.
    dummyIterator = {} as any
    // Initialize state with a known status.
    initialState = { status: 'connected', listeners: [] }
    // Register the iterator with its state.
    registerEventIteratorState(dummyIterator, initialState)
  })

  it('invokes the callback immediately if notifyImmediately is true', () => {
    const callback = vi.fn()
    onEventIteratorStatusChange(dummyIterator, callback, { notifyImmediately: true })
    // The callback should be called right away with the current status.
    expect(callback).toHaveBeenCalledWith('connected')
  })

  it('does not invoke the callback immediately if notifyImmediately is false', () => {
    const callback = vi.fn()
    onEventIteratorStatusChange(dummyIterator, callback, { notifyImmediately: false })
    // Since immediate notification is disabled, the callback should not have been called.
    expect(callback).not.toHaveBeenCalled()
  })

  it('calls the callback when the status is updated', () => {
    const callback = vi.fn()
    onEventIteratorStatusChange(dummyIterator, callback, { notifyImmediately: false })
    updateEventIteratorStatus(initialState, 'reconnecting')
    // The callback should be called with the new status.
    expect(callback).toHaveBeenCalledWith('reconnecting')
  })

  it('does not call the callback if the status is updated to the same value', () => {
    const callback = vi.fn()
    onEventIteratorStatusChange(dummyIterator, callback, { notifyImmediately: false })
    // Update with the same status as the initial one.
    updateEventIteratorStatus(initialState, 'connected')
    // The callback should not be triggered.
    expect(callback).not.toHaveBeenCalled()
  })

  it('removes the listener when unsubscribed', () => {
    const callback = vi.fn()
    const unsubscribe = onEventIteratorStatusChange(dummyIterator, callback, { notifyImmediately: false })
    // Update status to trigger the callback.
    updateEventIteratorStatus(initialState, 'reconnecting')
    expect(callback).toHaveBeenCalledTimes(1)

    // Unsubscribe the listener.
    unsubscribe()

    // Update status again; the callback should not be called.
    updateEventIteratorStatus(initialState, 'closed')
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('throws an error if the iterator is not registered', () => {
    const unregisteredIterator = {} as any
    const callback = vi.fn()
    expect(() =>
      onEventIteratorStatusChange(unregisteredIterator, callback),
    ).toThrow('Iterator is not registered.')
  })
})
