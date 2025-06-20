import type { DurableEventIteratorObject } from './durable-object'
import {
  ServerDurableEventIterator as DurableEventIteratorServer,
} from './event-iterator'

export interface DurableEventIteratorBuilderOptions {
  signingKey: string
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
  ): DurableEventIteratorServer<T> {
    return new DurableEventIteratorServer<T>(channel, this.options)
  }
}
