import type {
  experimental_DurableEventIteratorBuilderOptions as DurableEventIteratorBuilderOptions,
} from './builder'
import type {
  experimental_DurableEventIteratorClient as DurableEventIteratorClient,
} from './client'
import type { experimental_DurableEventIteratorObject } from './durable-event-iterator/object'
import {
  experimental_createDurableEventIteratorClient as createDurableEventIteratorClient,
} from './client'

export interface experimental_DurableEventIteratorOptions extends DurableEventIteratorBuilderOptions {}

export class experimental_DurableEventIteratorServer<
  T extends experimental_DurableEventIteratorObject<any, any, any>,
> implements PromiseLike<DurableEventIteratorClient<T>> {
  constructor(
    private readonly channel: string,
    private readonly options: experimental_DurableEventIteratorOptions,
  ) {}

  then<TResult1 = DurableEventIteratorClient<T, unknown>, TResult2 = never>(onfulfilled?: ((value: DurableEventIteratorClient<T, unknown>) => TResult1 | PromiseLike<TResult1>) | null | undefined, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(createDurableEventIteratorClient(
      () => Promise.reject(new Error('[DurableEventIteratorServer] cannot be iterated directly.')),
      () => Promise.reject(new Error('[DurableEventIteratorServer] cannot be cleaned up directly.')),
    )).then(onfulfilled, onrejected)
  }
}
