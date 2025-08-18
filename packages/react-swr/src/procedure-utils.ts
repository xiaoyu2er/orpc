import type { Client, ClientContext } from '@orpc/client'
import type { InferAsyncIterableYield, MaybeOptionalOptions, ThrowableError } from '@orpc/shared'
import type { CreateFetcherOptions, CreateKeyOptions, CreateSubscriberOptions, Fetcher, Key, Mutator, Subscriber, SWROperationContext } from './types'
import { isAsyncIteratorObject, resolveMaybeOptionalOptions } from '@orpc/shared'
import { resolveCreateFetcherOptions, resolveCreateKeyOptions, SWR_OPERATION_CONTEXT_SYMBOL } from './types'

export interface ProcedureUtilsOptions {
  path: readonly string[]
}

export interface ProcedureUtils<TClientContext extends ClientContext, TInput, TOutput, TError> {
  call: Client<TClientContext, TInput, TOutput, TError>

  key(
    ...rest: MaybeOptionalOptions<CreateKeyOptions<TInput>>
  ): Key<TInput>

  fetcher(
    ...rest: MaybeOptionalOptions<CreateFetcherOptions<TClientContext>>
  ): Fetcher<TInput, TOutput>

  /**
   * @remarks Uses ThrowableError instead of TError because TError only applies to the initial request. Streaming errors are not validated, so type safety cannot be guaranteed for error types.
   */
  subscriber(
    ...rest: MaybeOptionalOptions<CreateSubscriberOptions<TClientContext>>
  ): Subscriber<TInput, InferAsyncIterableYield<TOutput>[], ThrowableError>

  /**
   * @remarks Uses ThrowableError instead of TError because TError only applies to the initial request. Streaming errors are not validated, so type safety cannot be guaranteed for error types.
   */
  liveSubscriber(
    ...rest: MaybeOptionalOptions<CreateFetcherOptions<TClientContext>>
  ): Subscriber<TInput, InferAsyncIterableYield<TOutput>, ThrowableError>

  mutator(
    ...rest: MaybeOptionalOptions<CreateFetcherOptions<TClientContext>>
  ): Mutator<TInput, TOutput>
}

export function createProcedureUtils<TClientContext extends ClientContext, TInput, TOutput, TError>(
  client: Client<TClientContext, TInput, TOutput, TError>,
  options: ProcedureUtilsOptions,
): ProcedureUtils<TClientContext, TInput, TOutput, TError> {
  return {
    call: client,

    key(...rest) {
      const { input } = resolveCreateKeyOptions(resolveMaybeOptionalOptions(rest))

      return [options.path, { input }]
    },

    fetcher(...rest) {
      const { context } = resolveCreateFetcherOptions(resolveMaybeOptionalOptions(rest))

      return async ([, { input }]) => client(input, {
        context: {
          [SWR_OPERATION_CONTEXT_SYMBOL]: { type: 'fetcher' },
          ...context,
        } satisfies SWROperationContext,
      })
    },

    subscriber(...rest) {
      const { context, maxChunks } = resolveCreateFetcherOptions(resolveMaybeOptionalOptions(rest))

      return ([,{ input }], { next }) => {
        const controller = new AbortController()

        void (async () => {
          try {
            const iterator = await client(input, {
              context: {
                [SWR_OPERATION_CONTEXT_SYMBOL]: { type: 'subscriber' },
                ...context,
              } satisfies SWROperationContext,
              signal: controller.signal,
            })

            if (!isAsyncIteratorObject(iterator)) {
              throw new Error('.subscriber requires an event iterator output')
            }

            for await (const event of iterator) {
              next(undefined, (old) => {
                const newData = Array.isArray(old) ? [...old, event] : [event]

                if (typeof maxChunks === 'number' && newData.length > maxChunks) {
                  return newData.slice(newData.length - maxChunks)
                }

                return newData
              })
            }
          }
          catch (error) {
            /**
             * Only report the error if the controller is not aborted.
             */
            if (!controller.signal.aborted) {
              next(error as ThrowableError)
            }
          }
        })()

        return () => {
          controller.abort()
        }
      }
    },

    liveSubscriber(...rest) {
      const { context } = resolveCreateFetcherOptions(resolveMaybeOptionalOptions(rest))

      return ([,{ input }], { next }) => {
        const controller = new AbortController()

        void (async () => {
          try {
            const iterator = await client(input, {
              context: {
                [SWR_OPERATION_CONTEXT_SYMBOL]: { type: 'liveSubscriber' },
                ...context,
              } satisfies SWROperationContext,
              signal: controller.signal,
            })

            if (!isAsyncIteratorObject(iterator)) {
              throw new Error('.liveSubscriber requires an event iterator output')
            }

            for await (const event of iterator) {
              next(undefined, event)
            }
          }
          catch (error) {
            /**
             * Only report the error if the controller is not aborted.
             */
            if (!controller.signal.aborted) {
              next(error as ThrowableError)
            }
          }
        })()

        return () => {
          controller.abort()
        }
      }
    },

    mutator(...rest) {
      const { context } = resolveCreateFetcherOptions(resolveMaybeOptionalOptions(rest))

      return (_key, { arg }) => client(arg, {
        context: {
          [SWR_OPERATION_CONTEXT_SYMBOL]: { type: 'mutator' },
          ...context,
        } satisfies SWROperationContext,
      })
    },
  }
}
