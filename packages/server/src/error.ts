import type { HTTPStatus } from '@orpc/contract'
import { ZodError, type ZodIssue } from 'zod'

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
    public zzORPCError: {
      code: TCode
      status?: HTTPStatus
      message?: string
      cause?: unknown
    } & (undefined extends TData ? { data?: TData } : { data: TData }),
  ) {
    if (
      zzORPCError.status &&
      (zzORPCError.status <= 400 || zzORPCError.status >= 600)
    ) {
      throw new Error('The ORPCError status code must be in the 400-599 range.')
    }

    super(zzORPCError.message, { cause: zzORPCError.cause })
  }

  get code(): TCode {
    return this.zzORPCError.code
  }

  get status(): HTTPStatus {
    return this.zzORPCError.status ?? ORPC_ERROR_CODE_STATUSES[this.code]
  }

  get data(): TData {
    return this.zzORPCError.data as TData
  }

  get issues(): ZodIssue[] | undefined {
    if (
      this.code === 'BAD_REQUEST' &&
      this.zzORPCError.cause instanceof ZodError
    ) {
      return this.zzORPCError.cause.issues
    }

    return undefined
  }
}
