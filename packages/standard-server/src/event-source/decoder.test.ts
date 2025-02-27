import type { EventMessage } from './types'
import { decodeEventMessage, EventDecoder, EventDecoderStream } from './decoder'

describe('decodeEventMessage', () => {
  it('on success', () => {
    expect(decodeEventMessage('data: \n\n')).toEqual({
      data: '',
    })

    expect(decodeEventMessage('event: message\ndata: hello\ndata: world\n\n')).toEqual({
      event: 'message',
      data: 'hello\nworld',
    })

    expect(decodeEventMessage('event: message\ndata: hello\ndata: world\nid: 123\nretry: 10000\n\n')).toEqual({
      event: 'message',
      data: 'hello\nworld',
      id: '123',
      retry: 10000,
    })
  })

  it('unknown keys', () => {
    expect(() => decodeEventMessage('foo: bar\n\n'))
      .toThrowError('Unknown EventSource message key: foo')
    expect(() => decodeEventMessage('bar: bar\ndata: hello\n\n'))
      .toThrowError('Unknown EventSource message key: bar')
  })

  it('duplicate keys', () => {
    expect(() => decodeEventMessage('id: 123\nid: 456\n\n'))
      .toThrowError('Duplicate EventSource message key: id')

    expect(() => decodeEventMessage('event: message\nevent: message\ndata: hello\n\n'))
      .toThrowError('Duplicate EventSource message key: event')

    expect(() => decodeEventMessage('ndata: 123\ndata: 456\n\n'))
      .not
      .toThrowError('Duplicate EventSource message key: ndata')
  })

  it('invalid retry', () => {
    expect(() => decodeEventMessage('retry: hello\n\n'))
      .toThrowError('Invalid EventSource message retry value: hello')

    expect(() => decodeEventMessage('retry: 1.5\n\n'))
      .toThrowError('Invalid EventSource message retry value: 1.5')

    expect(() => decodeEventMessage('retry: -1\n\n'))
      .toThrowError('Invalid EventSource message retry value: -1')

    expect(() => decodeEventMessage('retry: 1abc\n\n'))
      .toThrowError('Invalid EventSource message retry value: 1abc')

    expect(() => decodeEventMessage('retry: Infinity\n\n'))
      .toThrowError('Invalid EventSource message retry value: Infinity')
  })

  it('invalid format', () => {
    expect(() => decodeEventMessage('data: hello\n\ndata: world\n\n'))
      .toThrowError('Invalid EventSource message line: ')

    expect(() => decodeEventMessage('hi'))
      .toThrowError('Invalid EventSource message line: hi')
  })
})

it('eventSourceDecoder', () => {
  const onEvent = vi.fn()

  const decoder = new EventDecoder({ onEvent })

  decoder.feed('event: message\ndata: hello1\ndata: world\n\n')
  decoder.feed('event: message\ndata: hello2\ndata: world\nid: 123\nretry: 10000\n\n')
  decoder.feed('event: message\ndata: hello3\ndata: world\nid: 123\nretry: 10000\n\n')

  decoder.feed('event: done\n')
  decoder.feed('data: hello4\n')
  decoder.feed('data: world\n')
  decoder.end()

  expect(onEvent).toHaveBeenCalledTimes(4)
  expect(onEvent).toHaveBeenNthCalledWith(1, {
    data: 'hello1\nworld',
    event: 'message',
    id: undefined,
    retry: undefined,
  })
  expect(onEvent).toHaveBeenNthCalledWith(2, {
    data: 'hello2\nworld',
    event: 'message',
    id: '123',
    retry: 10000,
  })
  expect(onEvent).toHaveBeenNthCalledWith(3, {
    data: 'hello3\nworld',
    event: 'message',
    id: '123',
    retry: 10000,
  })
  expect(onEvent).toHaveBeenNthCalledWith(4, {
    data: 'hello4\nworld',
    event: 'done',
    id: undefined,
    retry: undefined,
  })
})

it('eventSourceDecoderStream', async () => {
  const stream = new ReadableStream<string>({
    start(controller) {
      controller.enqueue('event: message\ndata: hello1\ndata: world\n\n')
      controller.enqueue('event: message\ndata: hello2\ndata: world\nid: 123\nretry: 10000\n\n')
      controller.enqueue('event: message\ndata: hello3\ndata: world\nid: 123\nretry: 10000\n\n')
      controller.enqueue('event: done\n')
      controller.enqueue('data: hello4\n')
      controller.enqueue('data: world\n')
      controller.close()
    },
  }).pipeThrough(new TextEncoderStream())

  const response = new Response(stream)

  const eventSourceStream = response.body!
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new EventDecoderStream())

  const messages: EventMessage[] = []

  for await (const message of eventSourceStream) {
    messages.push(message)
  }

  expect(messages).toEqual([
    {
      data: 'hello1\nworld',
      event: 'message',
      id: undefined,
      retry: undefined,
    },
    {
      data: 'hello2\nworld',
      event: 'message',
      id: '123',
      retry: 10000,
    },
    {
      data: 'hello3\nworld',
      event: 'message',
      id: '123',
      retry: 10000,
    },
    {
      data: 'hello4\nworld',
      event: 'done',
      id: undefined,
      retry: undefined,
    },
  ])
})
