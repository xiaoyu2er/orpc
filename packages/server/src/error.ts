import { HTTPStatus } from '@orpc/contract'
import { ZodError, ZodIssue } from 'zod'

export const ORPC_ERROR_CODE_STATUSES = {
  CUSTOM_ERROR: 500,

  /**
   * Invalid JSON was received by the server.
   * An error occurred on the server while parsing the JSON text.
   */
  PARSE_ERROR: 400,

  /**
   * The JSON sent is not a valid Request object.
   */
  BAD_REQUEST: 400,

  // Internal JSON-RPC error
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,

  // Implementation specific errors
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_SUPPORTED: 405,
  TIMEOUT: 408,
  CONFLICT: 409,
  PRECONDITION_FAILED: 412,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  UNPROCESSABLE_CONTENT: 422,
  TOO_MANY_REQUESTS: 429,
  CLIENT_CLOSED_REQUEST: 499,
} as const

export type ORPCErrorCode = keyof typeof ORPC_ERROR_CODE_STATUSES

export class ORPCError<TCode extends ORPCErrorCode, TData> extends Error {
  constructor(
    public __oe: {
      code: TCode
      status?: TCode extends 'CUSTOM_ERROR' ? HTTPStatus : never
      message?: string
      cause?: unknown
    } & (undefined extends TData ? { data?: TData } : { data: TData })
  ) {
    super(__oe.message, { cause: __oe.cause })
  }

  get code(): TCode {
    return this.__oe.code
  }

  get status(): Exclude<HTTPStatus, undefined> {
    return this.__oe.status ?? ORPC_ERROR_CODE_STATUSES[this.code]
  }

  get data(): TCode extends 'BAD_REQUEST' ? TData | ZodIssue[] : TData {
    if (this.code === 'BAD_REQUEST' && this.cause instanceof ZodError) {
      return this.cause.issues as any
    }

    return this.__oe.data as TData
  }
}
