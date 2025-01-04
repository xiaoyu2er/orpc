import type { ANY_MAP_INPUT_MIDDLEWARE, ANY_MIDDLEWARE, MapInputMiddleware, Middleware, MiddlewareNextFn } from './middleware'
import type { Context, MergeContext, WELL_CONTEXT } from './types'
import { mergeContext } from './utils'

export interface DecoratedMiddleware<
  TContext extends Context,
  TExtraContext extends Context,
  TInput,
  TOutput,
> extends Middleware<TContext, TExtraContext, TInput, TOutput> {
  concat: (<
    UExtraContext extends Context & Partial<MergeContext<TContext, TExtraContext>> | undefined = undefined,
    UInput = unknown,
  >(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      UExtraContext,
            UInput & TInput,
            TOutput
    >,
  ) => DecoratedMiddleware<
    TContext,
    MergeContext<TExtraContext, UExtraContext>,
        UInput & TInput,
        TOutput
  >) & (<
    UExtraContext extends Context & Partial<MergeContext<TContext, TExtraContext>> | undefined = undefined,
    UInput = TInput,
    UMappedInput = unknown,
  >(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      UExtraContext,
      UMappedInput,
      TOutput
    >,
    mapInput: MapInputMiddleware<UInput & TInput, UMappedInput>,
  ) => DecoratedMiddleware<
    TContext,
    MergeContext<TExtraContext, UExtraContext>,
        UInput & TInput,
        TOutput
  >)

  mapInput: <UInput = unknown>(
    map: MapInputMiddleware<UInput, TInput>,
  ) => DecoratedMiddleware<TContext, TExtraContext, UInput, TOutput>
}

export function decorateMiddleware<
  TContext extends Context = WELL_CONTEXT,
  TExtraContext extends Context = undefined,
  TInput = unknown,
  TOutput = unknown,
>(
  middleware: Middleware<TContext, TExtraContext, TInput, TOutput>,
): DecoratedMiddleware<TContext, TExtraContext, TInput, TOutput> {
  const decorated = middleware as DecoratedMiddleware<TContext, TExtraContext, TInput, TOutput>

  decorated.mapInput = (mapInput) => {
    const mapped = decorateMiddleware(
      (options, input, ...rest) => middleware(options as any, mapInput(input as any), ...rest as [any]),
    )

    return mapped as any
  }

  decorated.concat = (concatMiddleware: ANY_MIDDLEWARE, mapInput?: ANY_MAP_INPUT_MIDDLEWARE) => {
    const mapped = mapInput
      ? decorateMiddleware(concatMiddleware).mapInput(mapInput)
      : concatMiddleware

    const concatted = decorateMiddleware((options, input, output, ...rest) => {
      const next: MiddlewareNextFn<any> = async (nextOptions) => {
        return mapped({ ...options, context: mergeContext(nextOptions.context, options.context) }, input, output, ...rest)
      }

      const merged = middleware({ ...options, next } as any, input as any, output as any, ...rest)

      return merged
    })

    return concatted as any
  }

  return decorated
}
