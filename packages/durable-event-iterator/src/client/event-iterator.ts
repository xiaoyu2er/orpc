import type { Client, ClientLink, NestedClient, ThrowableError } from '@orpc/client'
import type { ClientRetryPluginContext } from '@orpc/client/plugins'
import type { AsyncIteratorClass, Value } from '@orpc/shared'
import type { DurableEventIteratorObject, InferDurableEventIteratorObjectRPC } from '../object'
import { createORPCClient } from '@orpc/client'
import { isAsyncIteratorObject, value } from '@orpc/shared'
import { parseToken } from '../schemas'

const CLIENT_DURABLE_EVENT_ITERATOR_TOKEN_SYMBOL = Symbol('ORPC_CLIENT_DURABLE_EVENT_ITERATOR_TOKEN')

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
  T extends DurableEventIteratorObject<any>,
  RPC extends InferDurableEventIteratorObjectRPC<T>,
> = AsyncIteratorClass<T extends DurableEventIteratorObject<infer TPayload> ? TPayload : never> & {
  [K in RPC]: T[K] extends (...args: any[]) => (infer R extends NestedClient<object>)
    ? ClientDurableEventIteratorRpc<R>
    : never
}

export interface CreateClientDurableEventIteratorOptions {
  /**
   * The token used to authenticate the client.
   * Can be function for dynamic token.
   */
  token: Value<string>
}

export function createClientDurableEventIterator<
  T extends DurableEventIteratorObject<any>,
  RPC extends InferDurableEventIteratorObjectRPC<T>,
>(
  iterator: AsyncIteratorClass<T>,
  link: ClientLink<object>,
  options: CreateClientDurableEventIteratorOptions,
): ClientDurableEventIterator<T, RPC> {
  const proxy = new Proxy(iterator, {
    get(target, prop) {
      const { rpc: allowMethods } = parseToken(value(options.token))

      if (prop === CLIENT_DURABLE_EVENT_ITERATOR_TOKEN_SYMBOL) {
        return options.token
      }

      if (typeof prop === 'string' && allowMethods?.includes(prop)) {
        return createORPCClient(link, { path: [prop] })
      }

      const v = Reflect.get(target, prop)
      return typeof v === 'function'
        ? v.bind(target) // Require .bind itself for calling
        : v
    },
  })

  return proxy as any
}

/**
 * If return a token if the client is a Client Durable Event Iterator.
 */
export function getClientDurableEventIteratorToken(
  client: unknown,
): string | undefined {
  if (isAsyncIteratorObject(client)) {
    return Reflect.get(client, CLIENT_DURABLE_EVENT_ITERATOR_TOKEN_SYMBOL) as string | undefined
  }
}
