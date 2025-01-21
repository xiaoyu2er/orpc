import type { ErrorMap } from './error-map'
import { fallbackORPCErrorStatus, ORPCError } from './error-orpc'

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
