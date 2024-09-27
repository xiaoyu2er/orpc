import { HTTPMethod } from '@orpc/contract'
import { MergeServerContext, ServerContext } from './types'

export interface ServerMiddleware<
  TContext extends ServerContext = any,
  TExtraContext extends ServerContext = any,
  TInput = unknown
> {
  (
    input: TInput,
    context: TContext,
    meta: {
      method: HTTPMethod
      path: string
    }
  ): { context?: TExtraContext } | void
}

export interface ExtendedServerMiddleware<
  TContext extends ServerContext = any,
  TExtraContext extends ServerContext = any,
  TInput = unknown
> extends ServerMiddleware<TContext, TExtraContext, TInput> {
  concat<UExtraContext extends ServerContext, UInput>(
    middleware: ServerMiddleware<
      MergeServerContext<TContext, TExtraContext>,
      UExtraContext,
      UInput & TInput
    >
  ): ExtendedServerMiddleware<
    TContext,
    MergeServerContext<TExtraContext, UExtraContext>,
    UInput & TInput
  >

  concat<UExtraContext extends ServerContext, UMappedInput extends TInput>(
    middleware: ServerMiddleware<
      MergeServerContext<TContext, TExtraContext>,
      UExtraContext,
      UMappedInput
    >,
    mapInput: (input: TInput) => UMappedInput
  ): ExtendedServerMiddleware<TContext, MergeServerContext<TExtraContext, UExtraContext>, TInput>
}

export function createExtendedServerMiddleware<
  TContext extends ServerContext = ServerContext,
  TExtraContext extends ServerContext = ServerContext,
  TInput = unknown
>(
  middleware: ServerMiddleware<TContext, TExtraContext, TInput>
): ExtendedServerMiddleware<TContext, TExtraContext, TInput> {
  const extended = new Proxy(middleware, {
    get(target, prop) {
      if (prop === 'concat') {
        return (...args: any[]) => {
          const [middleware_, mapInput] = args

          const middleware =
            typeof mapInput === 'function'
              ? new Proxy(middleware_, {
                  apply(_target, _thisArg, [input, ...rest]) {
                    return target(mapInput(input), ...(rest as [any, any]))
                  },
                })
              : middleware_

          return createExtendedServerMiddleware((input: any, context: any, meta: any) => {
            const r1 = target(input, context, meta)
            const r2 = middleware(
              input,
              {
                ...context,
                ...r1?.context,
              },
              meta
            )

            return {
              context: {
                ...r1?.context,
                ...r2?.context,
              },
            }
          })
        }
      }

      return Reflect.get(target, prop)
    },
  })

  return extended as any
}
