import type { Interceptor } from '@orpc/shared'
import type { DurableIteratorObject } from '.'
import type { DurableIteratorTokenPayload } from '../schemas'
import { intercept, toArray } from '@orpc/shared'
import { DURABLE_ITERATOR_TOKEN_PARAM } from '../consts'
import { verifyDurableIteratorToken } from '../schemas'

export interface UpgradeDurableIteratorRequestOptions {
  /**
   * The signing key used to verify the token
   */
  signingKey: string

  /**
   * The durable object namespace
   */
  namespace: DurableObjectNamespace<any>

  /**
   * intercept upgrade process
   */
  interceptors?: Interceptor<{ payload: DurableIteratorTokenPayload }, Promise<Response>>[]
}

/**
 * Verifies and upgrades a durable event iterator request.
 *
 * @info Verify token before forwarding to durable object to prevent DDoS attacks
 */
export async function upgradeDurableIteratorRequest(
  request: Request,
  options: UpgradeDurableIteratorRequestOptions,
): Promise<Response> {
  if (request.headers.get('upgrade') !== 'websocket') {
    return new Response('Expected WebSocket upgrade', {
      status: 426,
    })
  }

  const url = new URL(request.url)
  const token = url.searchParams.getAll(DURABLE_ITERATOR_TOKEN_PARAM).at(-1)

  if (!token) {
    return new Response('Token is required', {
      status: 401,
    })
  }

  const payload = await verifyDurableIteratorToken(options.signingKey, token)

  if (!payload) {
    return new Response('Invalid Token', {
      status: 401,
    })
  }

  return intercept(
    toArray(options.interceptors),
    { payload },
    async ({ payload }) => {
      const namespace = options.namespace as DurableObjectNamespace<DurableIteratorObject<any, any>>
      const id = namespace.idFromName(payload.chn)
      const stub = namespace.get(id)
      return stub.fetch(request)
    },
  )
}
