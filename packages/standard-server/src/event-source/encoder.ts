import type { EventMessage } from './types'
import { EventEncoderError } from './errors'

export function assertEventId(id: string): void {
  if (id.includes('\n')) {
    throw new EventEncoderError('Event-source id must not contain a newline character')
  }
}

export function assertEventName(event: string): void {
  if (event.includes('\n')) {
    throw new EventEncoderError('Event-source event must not contain a newline character')
  }
}

export function assertEventRetry(retry: number): void {
  if (!Number.isInteger(retry) || retry < 0) {
    throw new EventEncoderError('Event-source retry must be a integer and >= 0')
  }
}

export function encodeEventData(data: string | undefined): string {
  const lines = data?.split(/\n/) ?? []

  let output = ''

  for (const line of lines) {
    output += `data: ${line}\n`
  }

  return output
}

export function encodeEventMessage(message: Partial<EventMessage>): string {
  let output = ''

  if (message.event !== undefined) {
    assertEventName(message.event)

    output += `event: ${message.event}\n`
  }

  if (message.retry !== undefined) {
    assertEventRetry(message.retry)

    output += `retry: ${message.retry}\n`
  }

  if (message.id !== undefined) {
    assertEventId(message.id)

    output += `id: ${message.id}\n`
  }

  output += encodeEventData(message.data)
  output += '\n'

  return output
}
