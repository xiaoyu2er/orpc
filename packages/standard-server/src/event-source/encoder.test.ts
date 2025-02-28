import { encodeEventData, encodeEventMessage } from './encoder'

it('encodeEventData', () => {
  expect(encodeEventData(undefined)).toBe('')
  expect(encodeEventData('hello\nworld')).toBe('data: hello\ndata: world\n')
  expect(encodeEventData('hello\nworld\n')).toBe('data: hello\ndata: world\ndata: \n')
})

describe('encodeEventMessage', () => {
  it('on success', () => {
    expect(encodeEventMessage({})).toEqual('\n')
    expect(encodeEventMessage({ event: 'message', data: 'hello\nworld' })).toEqual('event: message\ndata: hello\ndata: world\n\n')
    expect(encodeEventMessage({ event: 'message', id: '123', retry: 10000 }))
      .toEqual('event: message\nretry: 10000\nid: 123\n\n')
  })

  it('invalid event', () => {
    expect(() => encodeEventMessage({ event: 'hi\n' }))
      .toThrowError('Event-source event must not contain a newline character')
  })

  it('invalid id', () => {
    expect(() => encodeEventMessage({ event: 'message', id: 'hi\n' }))
      .toThrowError('Event-source id must not contain a newline character')
  })

  it('invalid retry', () => {
    expect(() => encodeEventMessage({ event: 'message', retry: Number.NaN }))
      .toThrowError('Event-source retry must be a integer and >= 0')

    expect(() => encodeEventMessage({ event: 'message', retry: -1 }))
      .toThrowError('Event-source retry must be a integer and >= 0')

    expect(() => encodeEventMessage({ event: 'message', retry: 1.5 }))
      .toThrowError('Event-source retry must be a integer and >= 0')
  })
})
