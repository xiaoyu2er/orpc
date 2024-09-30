import { HTTPStatus } from '@orpc/contract'
import { ZodError, ZodIssue } from 'zod'

export const ORPC_ERROR_CODE_STATUSES = {
  BAD_REQUEST: 400,
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

  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const

export type ORPCErrorCode = keyof typeof ORPC_ERROR_CODE_STATUSES

export class ORPCError<TCode extends ORPCErrorCode, TData> extends Error {
  constructor(
    public __oe: {
      code: TCode
      status?: HTTPStatus
      message?: string
      cause?: unknown
    } & (undefined extends TData ? { data?: TData } : { data: TData })
  ) {
    if (__oe.status && (__oe.status <= 400 || __oe.status >= 600)) {
      throw new Error('The ORPCError status code must be in the 400-599 range.')
    }

    super(__oe.message, { cause: __oe.cause })
  }

  get code(): TCode {
    return this.__oe.code
  }

  get status(): Exclude<HTTPStatus, undefined> {
    return this.__oe.status ?? ORPC_ERROR_CODE_STATUSES[this.code]
  }

  get data(): TData {
    return this.__oe.data as TData
  }

  get issues(): ZodIssue[] | undefined {
    if (this.code !== 'BAD_REQUEST') return undefined
    if (this.__oe.cause instanceof ZodError) return this.__oe.cause.issues
  }
}
