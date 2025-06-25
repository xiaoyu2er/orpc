import { AsyncIteratorClass } from '@orpc/shared'

export interface experimental_HibernationEventIteratorCallback {
  (id: string): void
}

export class experimental_HibernationEventIterator<T, TReturn = unknown, TNext = unknown>
  extends AsyncIteratorClass<T, TReturn, TNext>
  implements PromiseLike<AsyncIteratorClass<T, TReturn, TNext>> {
  constructor(
    public readonly hibernationCallback: experimental_HibernationEventIteratorCallback,
  ) {
    super(async () => {
      throw new Error('Cannot iterate over hibernating iterator directly')
    }, async (reason) => {
      if (reason !== 'next') {
        throw new Error('Cannot cleanup hibernating iterator directly')
      }
    })
  }

  then<TResult1 = AsyncIteratorClass<T, TReturn, TNext>, TResult2 = never>(
    onfulfilled?: ((value: AsyncIteratorClass<T, TReturn, TNext>) => TResult1 | PromiseLike<TResult1>) | null | undefined,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this).then(onfulfilled, onrejected)
  }
}
