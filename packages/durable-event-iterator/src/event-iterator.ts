import type { ClientLink } from '@orpc/client'
import type { ClientDurableEventIterator } from './client'
import type { DurableEventIteratorObject } from './object'
import type { DurableEventIteratorJwtPayload } from './schemas'
import { AsyncIteratorClass, toArray } from '@orpc/shared'
import { SignJWT } from 'jose'
import { createClientDurableEventIterator } from './client'

export type DurableEventIteratorOptions<
  T extends DurableEventIteratorObject<any, any>,
  RPC extends keyof T & string,
> = {
  /**
   * Signing key for the JWT.
   */
  signingKey: string

  /**
   * Time to live for the JWT in seconds.
   * After expiration, the JWT will no longer be valid.
   *
   * @default 24 hours (60 * 60 * 24)
   */
  jwtTTLSeconds?: number

  /**
   * The methods that are allowed to be called remotely.
   * You can use the `rmc` method if you cannot fill this field.
   *
   * @default []
   */
  rpc?: readonly RPC[]
} & (
    T extends DurableEventIteratorObject<any, infer U>
      ? undefined extends U ? {
        /**
         * attachment for the JWT.
         */
        att?: U
      } : {
        /**
         * attachment for the JWT.
         */
        att: U
      }
      : never
)

export class DurableEventIterator<
  T extends DurableEventIteratorObject<any, any>,
  RPC extends keyof T & string = never,
> implements PromiseLike<ClientDurableEventIterator<T, RPC>> {
  constructor(
    private readonly chn: string,
    private readonly options: DurableEventIteratorOptions<T, RPC>,
  ) {
  }

  rpc<U extends keyof T & string>(...rpc: U[]): DurableEventIterator<T, U> {
    return new DurableEventIterator<T, U>(this.chn, {
      ...this.options,
      rpc,
    })
  }

  then<TResult1 = ClientDurableEventIterator<T, RPC>, TResult2 = never>(
    onfulfilled?: ((value: ClientDurableEventIterator<T, RPC>) => TResult1 | PromiseLike<TResult1>) | null | undefined,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined,
  ): PromiseLike<TResult1 | TResult2> {
    return (async () => {
      const signingKey = new TextEncoder().encode(this.options.signingKey)
      const jwtTTLSeconds = this.options.jwtTTLSeconds ?? 60 * 60 * 24 // 24 hours
      const jwtAlg = 'HS256'

      const jwtPayload: DurableEventIteratorJwtPayload = {
        chn: this.chn,
        rpc: toArray(this.options.rpc),
        att: this.options.att,
      }

      const jwt = await new SignJWT(jwtPayload)
        .setProtectedHeader({ alg: jwtAlg })
        .setExpirationTime(new Date(Date.now() + jwtTTLSeconds * 1000))
        .sign(signingKey)

      const iterator = new AsyncIteratorClass<any>(
        () => Promise.reject(new Error('[DurableEventIteratorServer] cannot be iterated directly.')),
        () => Promise.reject(new Error('[DurableEventIteratorServer] cannot be cleaned up directly.')),
      )

      const link: ClientLink<object> = {
        call() {
          throw new Error('[DurableEventIteratorServer] cannot call methods directly.')
        },
      }

      const durableIterator = createClientDurableEventIterator(iterator, link, {
        jwt,
      })

      return durableIterator as ClientDurableEventIterator<T, RPC>
    })().then(onfulfilled, onrejected)
  }
}
