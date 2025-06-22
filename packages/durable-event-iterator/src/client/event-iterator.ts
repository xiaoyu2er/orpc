import type { Client, ClientLink, NestedClient, ThrowableError } from '@orpc/client'
import type { ClientRetryPluginContext } from '@orpc/client/plugins'
import type { DurableEventIteratorObject } from '../object'
import { createORPCClient } from '@orpc/client'
import { AsyncIteratorClass } from '@orpc/shared'
import { decodeJwt } from 'jose'
import * as v from 'valibot'
import { DurableEventIteratorJwtPayloadSchema } from '../schemas'

const DURABLE_EVENT_ITERATOR_CLIENT_JWT_SYMBOL = Symbol('ORPC_DURABLE_EVENT_ITERATOR_CLIENT_JWT')

export interface ClientDurableEventIteratorRpcContext extends ClientRetryPluginContext {
}

export type ClientDurableEventIteratorRpc<T extends NestedClient<object>>
  = T extends Client<any, infer UInput, infer UOutput, any>
    ? Client<ClientDurableEventIteratorRpcContext, UInput, UOutput, ThrowableError>
    : {
        [K in keyof T]: T[K] extends NestedClient<object>
          ? ClientDurableEventIteratorRpc<T[K]>
          : never
      }

export type ClientDurableEventIterator<
  T extends DurableEventIteratorObject<any, any>,
  RPC extends string & keyof T,
> = AsyncIteratorClass<T extends DurableEventIteratorObject<infer TPayload, any> ? TPayload : never> & {
  [K in RPC]: T[K] extends (...args: any[]) => (infer R extends NestedClient<object>)
    ? ClientDurableEventIteratorRpc<R>
    : never
}

export interface CreateClientDurableEventIteratorOptions {
  jwt: string
}

export function createClientDurableEventIterator<
  T extends DurableEventIteratorObject<any, any>,
  RPC extends keyof T & string,
>(
  iterator: AsyncIteratorClass<T>,
  link: ClientLink<object>,
  options: CreateClientDurableEventIteratorOptions,
): ClientDurableEventIterator<T, RPC> {
  const { rpc: allowMethods } = v.parse(DurableEventIteratorJwtPayloadSchema, decodeJwt(options.jwt))

  const proxy = new Proxy(iterator, {
    get(target, prop) {
      if (prop === DURABLE_EVENT_ITERATOR_CLIENT_JWT_SYMBOL) {
        return options.jwt
      }

      if (typeof prop === 'string' && allowMethods?.includes(prop)) {
        return createORPCClient(link, { path: [prop] })
      }

      const value = Reflect.get(target, prop, target)

      if (typeof value === 'function') {
        // async iterators require this
        return value.bind(target)
      }

      return value
    },
  })

  return proxy as any
}

/**
 * If return a JWT if the client is a Client Durable Event Iterator.
 */
export function getJwtIfClientDurableEventIterator(
  client: unknown,
): string | undefined {
  if (client instanceof AsyncIteratorClass) {
    return Reflect.get(client, DURABLE_EVENT_ITERATOR_CLIENT_JWT_SYMBOL) as string | undefined
  }
}
