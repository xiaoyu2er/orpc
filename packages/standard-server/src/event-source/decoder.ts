import type { EventMessage } from './types'
import { EventDecoderError } from './errors'

export function decodeEventMessage(encoded: string): EventMessage {
  const lines = encoded.replace(/\n+$/, '').split(/\n/)

  const message: EventMessage = {
    data: '',
    event: undefined,
    id: undefined,
    retry: undefined,
  }

  for (const line of lines) {
    const index = line.indexOf(': ')

    if (index === -1) {
      throw new EventDecoderError(`Invalid EventSource message line: ${line}`)
    }

    const key = line.slice(0, index)
    const value = line.slice(index + 2)

    if (key !== 'data' && key in message && message[key as keyof EventMessage] !== undefined) {
      throw new EventDecoderError(`Duplicate EventSource message key: ${key}`)
    }

    if (key === 'data') {
      message.data += `${value}\n`
    }
    else if (key === 'event') {
      message.event = value
    }
    else if (key === 'id') {
      message.id = value
    }
    else if (key === 'retry') {
      const maybeInteger = Number.parseInt(value)

      if (!Number.isInteger(maybeInteger) || maybeInteger < 0 || maybeInteger.toString() !== value) {
        throw new EventDecoderError(`Invalid EventSource message retry value: ${value}`)
      }

      message.retry = maybeInteger
    }
    else {
      throw new EventDecoderError(`Unknown EventSource message key: ${key}`)
    }
  }

  message.data = message.data.replace(/\n$/, '')

  return message
}

export interface EventDecoderOptions {
  onEvent?: (event: EventMessage) => void
}

export class EventDecoder {
  private incomplete: string = ''

  constructor(private options: EventDecoderOptions = {}) {
  }

  feed(chunk: string): void {
    this.incomplete += chunk

    const lastCompleteIndex = this.incomplete.lastIndexOf('\n\n')

    if (lastCompleteIndex === -1) {
      return
    }

    const completes = this.incomplete.slice(0, lastCompleteIndex).split(/\n\n/)
    this.incomplete = this.incomplete.slice(lastCompleteIndex + 2)

    for (const encoded of completes) {
      const message = decodeEventMessage(`${encoded}\n\n`)

      if (this.options.onEvent) {
        this.options.onEvent(message)
      }
    }

    this.incomplete = ''
  }

  end(): void {
    if (this.incomplete) {
      throw new EventDecoderError('EventSource ended before complete')
    }
  }
}

export class EventDecoderStream extends TransformStream<string, EventMessage> {
  constructor() {
    let decoder!: EventDecoder

    super({
      start(controller) {
        decoder = new EventDecoder({
          onEvent: (event) => {
            controller.enqueue(event)
          },
        })
      },
      transform(chunk) {
        decoder.feed(chunk)
      },
      flush() {
        decoder.end()
      },
    })
  }
}
