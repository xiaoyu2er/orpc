import type { ORPCError, ORPCErrorCode } from '@orpc/client'
import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { Schema, SchemaOutput } from './schema'

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

export type ErrorMapItem<TDataSchema extends Schema> = {
  status?: number
  message?: string
  description?: string
  data?: TDataSchema
}

export type ErrorMap = {
  [key in ORPCErrorCode]?: ErrorMapItem<Schema>
}

export type MergedErrorMap<T1 extends ErrorMap, T2 extends ErrorMap> = Omit<T1, keyof T2> & T2

export function mergeErrorMap<T1 extends ErrorMap, T2 extends ErrorMap>(errorMap1: T1, errorMap2: T2): MergedErrorMap<T1, T2> {
  return { ...errorMap1, ...errorMap2 }
}

export type ORPCErrorFromErrorMap<TErrorMap extends ErrorMap> = {
  [K in keyof TErrorMap]: K extends string
    ? TErrorMap[K] extends ErrorMapItem<infer TDataSchema>
      ? ORPCError<K, SchemaOutput<TDataSchema>>
      : never
    : never
}[keyof TErrorMap]

export type ErrorFromErrorMap<TErrorMap extends ErrorMap> = Error | ORPCErrorFromErrorMap<TErrorMap>
