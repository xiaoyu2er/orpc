import type { MaybeOptionalOptions } from '@orpc/shared'
import type { ServerDurableEventIteratorOptions } from './event-iterator'
import type { DurableEventIteratorObject } from './object'
import { resolveMaybeOptionalOptions } from '@orpc/shared'
import { ServerDurableEventIterator } from './event-iterator'

export interface DurableEventIteratorBuilderOptions extends Pick<ServerDurableEventIteratorOptions<any>, 'signingKey' | 'tokenLifetime'> {

}

export class DurableEventIteratorBuilder<
  T extends DurableEventIteratorObject<any, any>,
> {
  constructor(
    private readonly options: DurableEventIteratorBuilderOptions,
  ) {
  }

  subscribe(
    channel: string,
    ...rest: MaybeOptionalOptions<
      Partial<ServerDurableEventIteratorOptions<unknown>>
      & (
        T extends DurableEventIteratorObject<any, infer U>
          ? undefined extends U
            ? { attachment?: U }
            : { attachment: U }
          : never
      )
    >
  ): ServerDurableEventIterator<T> {
    const options = resolveMaybeOptionalOptions(rest)

    return new ServerDurableEventIterator<T>(channel, {
      ...this.options,
      ...options,
    })
  }
}
