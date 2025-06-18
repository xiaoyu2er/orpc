import type {
  experimental_DurableEventIteratorObject as DurableEventIteratorObject,
} from './object'
import {
  experimental_DurableEventIteratorServer as DurableEventIteratorServer,
} from './event-iterator'

export interface experimental_DurableEventIteratorBuilderOptions {
  secret: string
}

export class experimental_DurableEventIteratorBuilder<
  T extends DurableEventIteratorObject<any, any, any>,
> {
  constructor(
    private readonly options: experimental_DurableEventIteratorBuilderOptions,
  ) {
  }

  channel(
    channel: string,
  ): DurableEventIteratorServer<T> {
    return new DurableEventIteratorServer<T>(channel, this.options)
  }
}
