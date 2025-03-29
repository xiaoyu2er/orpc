import type { Interceptor } from '@orpc/shared'
import { type Client, ORPCError } from '@orpc/client'
import { StandardBracketNotationSerializer } from '@orpc/openapi-client/standard'
import { intercept, onError, toArray } from '@orpc/shared'

export interface FormAction {
  (form: FormData): Promise<void>
}

export interface CreateFormActionOptions<TOutput, TError extends Error> {
  interceptors?: Interceptor<{ form: FormData }, TOutput, TError>[]
}

export const orpcErrorToNextHttpFallbackInterceptor: Interceptor<any, any, any> = onError((error) => {
  if (error instanceof ORPCError && [401, 403, 404].includes(error.status)) {
    const nextError = ORPCError.fromJSON(error.toJSON()) as any

    nextError.cause = error
    nextError.digest = `NEXT_HTTP_ERROR_FALLBACK;${error.status}`

    throw nextError
  }
})

export function createFormAction<TOutput, TError extends Error>(
  client: Client<Record<never, never>, any, TOutput, TError>,
  options: CreateFormActionOptions<TOutput, TError> = {},
): FormAction {
  const bracketNotation = new StandardBracketNotationSerializer()

  return async (form) => {
    await intercept([orpcErrorToNextHttpFallbackInterceptor, ...toArray(options.interceptors)], { form }, ({ form }) => {
      const input = bracketNotation.deserialize([...form])
      return client(input)
    })
  }
}
