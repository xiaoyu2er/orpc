import type { Router } from '../router'
import type { FetchHandler, FetchHandlerOptions } from './types'
import { ORPCError } from '@orpc/shared/error'

export type HandleFetchRequestOptions<TRouter extends Router<any>> = FetchHandlerOptions<TRouter> & {
  handlers: FetchHandler[]
}

export async function handleFetchRequest< TRouter extends Router<any>>(
  options: HandleFetchRequestOptions<TRouter>,
) {
  for (const handler of options.handlers) {
    const response = await handler(options)

    if (response) {
      return response
    }
  }

  const error = new ORPCError({ code: 'NOT_FOUND', message: 'Not found' })

  return new Response(JSON.stringify(error.toJSON()), {
    status: error.status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
