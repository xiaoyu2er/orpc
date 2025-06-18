import type {
  experimental_DurableEventIteratorBuilderOptions as DurableEventIteratorBuilderOptions,
} from './builder'
import type {
  experimental_ClientDurableEventIterator as DurableEventIteratorClient,
} from './client'
import type {
  experimental_DurableEventIteratorObject as DurableEventIteratorObject,
} from './object'
import { AsyncIteratorClass } from '@orpc/shared'
import {
  experimental_createClientDurableEventIterator as createDurableEventIteratorClient,
} from './client'

export interface experimental_ServerDurableEventIteratorOptions extends DurableEventIteratorBuilderOptions {}

export class experimental_ServerDurableEventIterator<
  T extends DurableEventIteratorObject<any, any, any>,
> implements PromiseLike<DurableEventIteratorClient<T>> {
  constructor(
    private readonly channel: string,
    private readonly options: experimental_ServerDurableEventIteratorOptions,
  ) {}

  then<TResult1 = DurableEventIteratorClient<T, unknown>, TResult2 = never>(onfulfilled?: ((value: DurableEventIteratorClient<T, unknown>) => TResult1 | PromiseLike<TResult1>) | null | undefined, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(createDurableEventIteratorClient(
      new AsyncIteratorClass<any>(
        () => Promise.reject(new Error('[DurableEventIteratorServer] cannot be iterated directly.')),
        () => Promise.reject(new Error('[DurableEventIteratorServer] cannot be cleaned up directly.')),
      ),
      {
        jwt: 'some jwt here',
      },
    )).then(onfulfilled, onrejected)
  }
}
