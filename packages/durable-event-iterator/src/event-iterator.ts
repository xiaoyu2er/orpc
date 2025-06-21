import type { ClientDurableEventIterator } from './client'
import type { DurableEventIteratorObject } from './object'
import type { DurableEventIteratorJwtPayload } from './schemas'
import { AsyncIteratorClass } from '@orpc/shared'
import { SignJWT } from 'jose'
import { createClientDurableEventIterator } from './client'

export interface ServerDurableEventIteratorOptions<TJwtAttachment> {
  /**
   * Signing key for the JWT.
   */
  signingKey: string

  /**
   * Time to live for the JWT in seconds.
   *
   * @default 24 hours (60 * 60 * 24)
   */
  tokenLifetime?: number

  /**
   * attachment for the JWT.
   */
  attachment?: TJwtAttachment
}

export class ServerDurableEventIterator<
  T extends DurableEventIteratorObject<any, any>,
  TJwtAttachment = T extends DurableEventIteratorObject<any, infer U> ? U : never,
> implements PromiseLike<ClientDurableEventIterator<T>> {
  readonly #channel: string
  readonly #signingKey: string
  readonly #tokenLifetime: number
  readonly #attachment?: TJwtAttachment

  constructor(
    channel: string,
    options: ServerDurableEventIteratorOptions<TJwtAttachment>,
  ) {
    this.#channel = channel
    this.#signingKey = options.signingKey
    this.#tokenLifetime = options.tokenLifetime ?? 60 * 60 * 24 // 24 hours
    this.#attachment = options.attachment
  }

  then<TResult1 = ClientDurableEventIterator<T>, TResult2 = never>(onfulfilled?: ((value: ClientDurableEventIterator<T>) => TResult1 | PromiseLike<TResult1>) | null | undefined, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined): PromiseLike<TResult1 | TResult2> {
    const payload: DurableEventIteratorJwtPayload = {
      chn: this.#channel,
      att: this.#attachment,
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
