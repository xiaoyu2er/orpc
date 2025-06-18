import type { AsyncIteratorClassCleanupFn, AsyncIteratorClassNextFn } from '@orpc/shared'
import type { experimental_DurableEventIteratorObject as DurableEventIteratorObject } from '../object'
import { AsyncIteratorClass } from '@orpc/shared'

const DURABLE_EVENT_ITERATOR_CLIENT_JWT_SYMBOL = Symbol('ORPC_DURABLE_EVENT_ITERATOR_CLIENT_JWT')

export interface experimental_DurableEventIteratorClient<
  T extends DurableEventIteratorObject<TEventPayload, any, any>,
  TEventPayload = unknown,
> extends AsyncIteratorClass<TEventPayload> {

}

export function experimental_createClientDurableEventIterator<
  T extends DurableEventIteratorObject<any, any, any>,
>(
  jwt: string,
  next: AsyncIteratorClassNextFn<T, unknown>,
  cleanup: AsyncIteratorClassCleanupFn,
): experimental_DurableEventIteratorClient<T> {
  return new Proxy(new AsyncIteratorClass(
    next,
    cleanup,
  ), {
    get(target, prop, receiver) {
      if (prop === DURABLE_EVENT_ITERATOR_CLIENT_JWT_SYMBOL) {
        return jwt
      }
      return Reflect.get(target, prop, receiver)
    },
  })
}

export function getJwtIfEventIteratorClient(
  client: unknown,
): string | undefined {
  if (client instanceof AsyncIteratorClass) {
    return (client as any)[DURABLE_EVENT_ITERATOR_CLIENT_JWT_SYMBOL] as string | undefined
  }
}
