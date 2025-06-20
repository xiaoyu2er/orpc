import type { DurableEventIteratorObject } from './durable-object'
import type {
  ServerDurableEventIteratorOptions,
} from './event-iterator'
import {
  ServerDurableEventIterator as DurableEventIteratorServer,
} from './event-iterator'

export interface DurableEventIteratorBuilderOptions extends ServerDurableEventIteratorOptions {

}

export class DurableEventIteratorBuilder<
  T extends DurableEventIteratorObject<any, any, any>,
> {
  constructor(
    private readonly options: DurableEventIteratorBuilderOptions,
  ) {
  }

  subscribe(
    channel: string,
    options: Partial<ServerDurableEventIteratorOptions> = {},
  ): DurableEventIteratorServer<T> {
    return new DurableEventIteratorServer<T>(channel, {
      ...this.options,
      ...options,
    })
  }
}
