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

export interface experimental_ServerDurableEventIteratorOptions extends DurableEventIteratorBuilderOptions {
  /**
   * Time to live for the JWT in seconds.
   *
   * @default 24 hours (60 * 60 * 24)
   */
  tokenLifetime?: number
}

export class experimental_ServerDurableEventIterator<
  T extends DurableEventIteratorObject<any, any, any>,
> implements PromiseLike<ClientDurableEventIterator<T>> {
  readonly #channel: string
  readonly #signingKey: string
  readonly #tokenLifetime: number

  constructor(
    channel: string,
    options: experimental_ServerDurableEventIteratorOptions,
  ) {
    this.#channel = channel
    this.#signingKey = options.signingKey
    this.#tokenLifetime = options.tokenLifetime ?? 60 * 60 * 24 // 24 hours
  }

  then<TResult1 = ClientDurableEventIterator<T>, TResult2 = never>(onfulfilled?: ((value: ClientDurableEventIterator<T>) => TResult1 | PromiseLike<TResult1>) | null | undefined, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined): PromiseLike<TResult1 | TResult2> {
    const payload: DurableEventIteratorJWTPayload = {
      chn: this.#channel,
    }

    return (async () => {
      const jwt = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime(new Date(Date.now() + this.#tokenLifetime * 1000))
        .sign(new TextEncoder().encode(this.#signingKey))

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
