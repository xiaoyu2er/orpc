import type { DurableEventIteratorObject } from '../object'
import { AsyncIteratorClass } from '@orpc/shared'

const DURABLE_EVENT_ITERATOR_CLIENT_JWT_SYMBOL = Symbol('ORPC_DURABLE_EVENT_ITERATOR_CLIENT_JWT')

export type ClientDurableEventIterator<
  T extends DurableEventIteratorObject<any, any>,
> = AsyncIteratorClass<T extends DurableEventIteratorObject<infer TPayload, any> ? TPayload : never> & {
}

export interface CreateClientDurableEventIteratorOptions {
  jwt: string
}

export function createClientDurableEventIterator<
  T extends DurableEventIteratorObject<any, any>,
>(
  iterator: AsyncIteratorClass<T>,
  options: CreateClientDurableEventIteratorOptions,
): ClientDurableEventIterator<T> {
  const proxy = new Proxy(iterator, {
    get(target, prop) {
      if (prop === DURABLE_EVENT_ITERATOR_CLIENT_JWT_SYMBOL) {
        return options.jwt
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
