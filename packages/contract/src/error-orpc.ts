import type { ErrorMap, ErrorMapItem } from './error-map'
import type { SchemaOutput } from './types'
import { isPlainObject } from '@orpc/shared'

export type ORPCErrorFromErrorMap<TErrorMap extends ErrorMap> = {
  [K in keyof TErrorMap]: K extends string
    ? TErrorMap[K] extends ErrorMapItem<infer TDataSchema>
      ? ORPCError<K, SchemaOutput<TDataSchema>>
      : never
    : never
}[keyof TErrorMap]

export const COMMON_ORPC_ERROR_CODE_STATUSES = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_SUPPORTED: 405,
  NOT_ACCEPTABLE: 406,
  TIMEOUT: 408,
  CONFLICT: 409,
  PRECONDITION_FAILED: 412,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  UNPROCESSABLE_CONTENT: 422,
  TOO_MANY_REQUESTS: 429,
  CLIENT_CLOSED_REQUEST: 499,

  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const

export type CommonORPCErrorCode = keyof typeof COMMON_ORPC_ERROR_CODE_STATUSES

export type ORPCErrorOptions<TCode extends string, TData> =
  & ErrorOptions
  & { defined?: boolean, code: TCode, status?: number, message?: string }
  & (undefined extends TData ? { data?: TData } : { data: TData })

export function fallbackORPCErrorStatus(code: CommonORPCErrorCode | (string & {}), status: number | undefined): number {
  return status ?? (COMMON_ORPC_ERROR_CODE_STATUSES as any)[code] ?? 500
}

export class ORPCError<TCode extends CommonORPCErrorCode | (string & {}), TData> extends Error {
  readonly defined: boolean
  readonly code: TCode
  readonly status: number
  readonly data: TData

  constructor(options: ORPCErrorOptions<TCode, TData>) {
    if (options.status && (options.status < 400 || options.status >= 600)) {
      throw new Error('[ORPCError] The error status code must be in the 400-599 range.')
    }

    super(options.message, options)

    this.code = options.code
    this.status = fallbackORPCErrorStatus(options.code, options.status)
    this.defined = options.defined ?? false

    // data only optional when TData is undefinable so can safely cast here
    this.data = options.data as TData
  }

  toJSON(): ORPCErrorJSON<TCode, TData> {
    return {
      defined: this.defined,
      code: this.code,
      status: this.status,
      message: this.message,
      data: this.data,
    }
  }

  static isValidJSON(json: unknown): json is ORPCErrorJSON<string, unknown> {
    return isPlainObject(json)
      && 'defined' in json
      && typeof json.defined === 'boolean'
      && 'code' in json
      && typeof json.code === 'string'
      && 'status' in json
      && typeof json.status === 'number'
      && 'message' in json
      && typeof json.message === 'string'
  }
}

export type ORPCErrorJSON<TCode extends string, TData> = Pick<ORPCError<TCode, TData>, 'defined' | 'code' | 'status' | 'message' | 'data'>

export function isDefinedError<T>(error: T): error is Extract<T, ORPCError<any, any>> {
  return error instanceof ORPCError && error.defined
}

export async function validateORPCError(map: ErrorMap, error: ORPCError<any, any>): Promise<ORPCError<string, unknown>> {
  const { code, status, message, data, cause, defined } = error
  const config = map?.[error.code]

  if (!config || fallbackORPCErrorStatus(error.code, config.status) !== error.status) {
    return defined
      ? new ORPCError({ defined: false, code, status, message, data, cause })
      : error
  }

  if (!config.data) {
    return defined
      ? error
      : new ORPCError({ defined: true, code, status, message, data, cause })
  }

  const validated = await config.data['~standard'].validate(error.data)

  if (validated.issues) {
    return defined
      ? new ORPCError({ defined: false, code, status, message, data, cause })
      : error
  }

  return new ORPCError({
    defined: true,
    code,
    status,
    message,
    data: validated.value,
    cause,
  })
}
