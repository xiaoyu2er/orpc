import type { ORPCError, ORPCErrorCode } from '@orpc/client'
import type { AnySchema, InferSchemaOutput, Schema, SchemaIssue } from './schema'

export interface ValidationErrorOptions extends ErrorOptions {
  message: string
  issues: readonly SchemaIssue[]
}

export class ValidationError extends Error {
  readonly issues: readonly SchemaIssue[]

  constructor(options: ValidationErrorOptions) {
    super(options.message, options)

    this.issues = options.issues
  }
}

export interface ErrorMapItem<TDataSchema extends AnySchema> {
  status?: number
  message?: string
  description?: string
  data?: TDataSchema
}

export type ErrorMap = {
  [key in ORPCErrorCode]?: ErrorMapItem<AnySchema>
}

export type MergedErrorMap<T1 extends ErrorMap, T2 extends ErrorMap> = Omit<T1, keyof T2> & T2

export function mergeErrorMap<T1 extends ErrorMap, T2 extends ErrorMap>(errorMap1: T1, errorMap2: T2): MergedErrorMap<T1, T2> {
  return { ...errorMap1, ...errorMap2 }
}

export type ORPCErrorFromErrorMap<TErrorMap extends ErrorMap> = {
  [K in keyof TErrorMap]: K extends string
    ? TErrorMap[K] extends ErrorMapItem<infer TDataSchema extends Schema<unknown, unknown>>
      ? ORPCError<K, InferSchemaOutput<TDataSchema>>
      : never
    : never
}[keyof TErrorMap]

export type ErrorFromErrorMap<TErrorMap extends ErrorMap> = Error | ORPCErrorFromErrorMap<TErrorMap>
