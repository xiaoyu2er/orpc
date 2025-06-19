import type {
  experimental_DurableEventIteratorBuilderOptions as DurableEventIteratorBuilderOptions,
} from './builder'
import type {
  experimental_ClientDurableEventIterator as ClientDurableEventIterator,
} from './client'
import type {
  experimental_DurableEventIteratorObject as DurableEventIteratorObject,
} from './object'
import type {
  experimental_DurableEventIteratorJWTPayload as DurableEventIteratorJWTPayload,
} from './schemas'
import { AsyncIteratorClass } from '@orpc/shared'
import { SignJWT } from 'jose'
import {
  experimental_createClientDurableEventIterator as createClientDurableEventIterator,
} from './client'

export interface experimental_ServerDurableEventIteratorOptions extends DurableEventIteratorBuilderOptions {}

export class experimental_ServerDurableEventIterator<
  T extends DurableEventIteratorObject<any, any, any>,
> implements PromiseLike<ClientDurableEventIterator<T>> {
  constructor(
    private readonly channel: string,
    private readonly options: experimental_ServerDurableEventIteratorOptions,
  ) {}

  then<TResult1 = ClientDurableEventIterator<T>, TResult2 = never>(onfulfilled?: ((value: ClientDurableEventIterator<T>) => TResult1 | PromiseLike<TResult1>) | null | undefined, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined): PromiseLike<TResult1 | TResult2> {
    const payload: DurableEventIteratorJWTPayload = {
      channel: this.channel,
    }

    return (async () => {
      const jwt = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .sign(new TextEncoder().encode(this.options.secret))

      const iterator = new AsyncIteratorClass<any>(
        () => Promise.reject(new Error('[DurableEventIteratorServer] cannot be iterated directly.')),
        () => Promise.reject(new Error('[DurableEventIteratorServer] cannot be cleaned up directly.')),
      )

      const durableIterator = createClientDurableEventIterator(iterator, {
        jwt,
      })

      return durableIterator as ClientDurableEventIterator<T>
    })().then(onfulfilled, onrejected)
  }
}
