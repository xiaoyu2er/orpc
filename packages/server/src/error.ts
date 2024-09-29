export const ORPC_ERROR_CODES = {
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

export type ORPCErrorOptions =
  | {
      code: Exclude<keyof typeof ORPC_ERROR_CODES, 'CUSTOM_ERROR'>
      message?: string
      cause?: unknown
    }
  | {
      code: 'CUSTOM_ERROR'
      httpStatusCode: number
      message: string
      cause?: unknown
    }

export class ORPCError extends Error {
  constructor(public __oe: ORPCErrorOptions) {
    super(__oe.message, { cause: __oe.cause })
  }

  public get httpStatusCode() {
    return 'httpStatusCode' in this.__oe
      ? this.__oe.httpStatusCode
      : ORPC_ERROR_CODES[this.__oe.code]
  }

  public get httpMessage() {
    return this.__oe.message
  }
}
