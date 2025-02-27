import type { JsonValue } from 'type-fest'

export class EventEncoderError extends TypeError { }
export class EventDecoderError extends TypeError { }

export interface ErrorEventOptions extends ErrorOptions {
  message?: string
  data?: undefined | JsonValue
}

export class ErrorEvent extends Error {
  public data: undefined | JsonValue

  constructor(options?: ErrorEventOptions) {
    super(options?.message ?? 'An error event was received', options)

    this.data = options?.data
  }
}

export class UnknownEvent extends ErrorEvent {}
