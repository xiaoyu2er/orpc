import type { experimental_DurableEventIteratorObject as DurableEventIteratorObject } from '../object'
import { AsyncIteratorClass } from '@orpc/shared'

const DURABLE_EVENT_ITERATOR_CLIENT_JWT_SYMBOL = Symbol('ORPC_DURABLE_EVENT_ITERATOR_CLIENT_JWT')

export type experimental_ClientDurableEventIterator<
  T extends DurableEventIteratorObject<any, any, any>,
> = AsyncIteratorClass<T extends DurableEventIteratorObject<infer TPayload, any, any> ? TPayload : never> & {
}

export interface experimental_CreateClientDurableEventIteratorOptions {
  jwt: string
}

export function experimental_createClientDurableEventIterator<
  T extends DurableEventIteratorObject<any, any, any>,
>(
  iterator: AsyncIteratorClass<T>,
  options: experimental_CreateClientDurableEventIteratorOptions,
): experimental_ClientDurableEventIterator<T> {
  const proxy = new Proxy(iterator, {
    get(target, prop, receiver) {
      if (prop === DURABLE_EVENT_ITERATOR_CLIENT_JWT_SYMBOL) {
        return options.jwt
      }

      return Reflect.get(target, prop, receiver)
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
