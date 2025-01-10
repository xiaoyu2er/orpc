import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { ErrorMap } from './error-map'
import type { ORPCErrorFromErrorMap } from './error-orpc'

export type ErrorFromErrorMap<TErrorMap extends ErrorMap> = Error | ORPCErrorFromErrorMap<TErrorMap>

export interface ValidationErrorOptions extends ErrorOptions {
  message: string
  issues: readonly StandardSchemaV1.Issue[]
}

export class ValidationError extends Error {
  readonly issues: readonly StandardSchemaV1.Issue[]

  constructor(options: ValidationErrorOptions) {
    super(options.message, options)

    this.issues = options.issues
  }
}
