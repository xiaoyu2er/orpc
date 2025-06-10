import { AsyncIteratorClass } from '@orpc/shared'

export interface experimental_HibernationEventIteratorCallback {
  (id: number): void
}

export class experimental_HibernationEventIterator<T, TReturn = unknown, TNext = unknown> extends AsyncIteratorClass<T, TReturn, TNext> {
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
}
