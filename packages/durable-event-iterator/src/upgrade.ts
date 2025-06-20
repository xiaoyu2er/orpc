import type { Interceptor } from '@orpc/shared'
import type {
  experimental_DurableEventIteratorObject as DurableEventIteratorObject,
} from './object'
import type {
  experimental_DurableEventIteratorJWTPayload as DurableEventIteratorJWTPayload,
} from './schemas'
import { intercept, stringifyJSON, toArray } from '@orpc/shared'
import { jwtVerify } from 'jose'
import * as v from 'valibot'
import {
  experimental_HIBERNATION_EVENT_ITERATOR_JWT_PARAM as HIBERNATION_EVENT_ITERATOR_JWT_PARAM,
  experimental_HIBERNATION_EVENT_ITERATOR_JWT_PAYLOAD_KEY as HIBERNATION_EVENT_ITERATOR_JWT_PAYLOAD_KEY,
} from './consts'
import {
  experimental_DurableEventIteratorJWTPayloadSchema as DurableEventIteratorJWTPayloadSchema,
} from './schemas'

export interface experimental_UpgradeDurableEventIteratorRequestOptions {
  namespace: DurableObjectNamespace<DurableEventIteratorObject<any, any, any>>
  signingKey: string
  interceptors?: Interceptor<{ jwtPayload: DurableEventIteratorJWTPayload }, Promise<Response>>[]
}

/**
 * Verifies and upgrades a durable event iterator request.
 */
export async function experimental_upgradeDurableEventIteratorRequest(
  request: Request,
  options: experimental_UpgradeDurableEventIteratorRequestOptions,
): Promise<Response> {
  if (request.headers.get('upgrade') !== 'websocket') {
    return new Response('Expected WebSocket upgrade', {
      status: 426,
    })
  }

  const url = new URL(request.url)
  const jwt = url.searchParams.getAll(HIBERNATION_EVENT_ITERATOR_JWT_PARAM).at(-1)

  if (!jwt) {
    return new Response('JWT is required', {
      status: 401,
    })
  }

  let jwtPayload

  try {
    const { payload } = await jwtVerify(jwt, new TextEncoder().encode(options.signingKey))
    jwtPayload = v.parse(DurableEventIteratorJWTPayloadSchema, payload)
  }
  catch {
    return new Response('Invalid JWT', {
      status: 401,
    })
  }

  return intercept(
    toArray(options.interceptors),
    { jwtPayload },
    async ({ jwtPayload }) => {
      const id = options.namespace.idFromName(jwtPayload.chn)
      const stub = options.namespace.get(id)

      const upgradeUrl = new URL(url.origin + url.pathname)

      upgradeUrl.searchParams.set(HIBERNATION_EVENT_ITERATOR_JWT_PAYLOAD_KEY, stringifyJSON(jwtPayload))

      return stub.fetch(upgradeUrl, request)
    },
  )
}
