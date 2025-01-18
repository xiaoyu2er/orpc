import type { Context } from './context'
import type { ORPCErrorConstructorMap } from './error'
import type { ANY_MAP_INPUT_MIDDLEWARE, ANY_MIDDLEWARE, MapInputMiddleware, Middleware, MiddlewareNextFn } from './middleware'

export interface DecoratedMiddleware<
  TInContext extends Context,
  TOutContext extends Context,
  TInput,
  TOutput,
  TErrorConstructorMap extends ORPCErrorConstructorMap<any>,
> extends Middleware<TInContext, TOutContext, TInput, TOutput, TErrorConstructorMap> {
  concat: (<UOutContext extends Context, UInput>(
    middleware: Middleware<
      TInContext,
      UOutContext,
      UInput & TInput,
      TOutput,
      TErrorConstructorMap
    >,
  ) => DecoratedMiddleware<
    TInContext,
    TOutContext & UOutContext,
    UInput & TInput,
    TOutput,
    TErrorConstructorMap
  >) & (<
    UOutContext extends Context,
    UInput = TInput,
    UMappedInput = unknown,
  >(
    middleware: Middleware<
      TInContext,
      UOutContext,
      UMappedInput,
      TOutput,
      TErrorConstructorMap
    >,
    mapInput: MapInputMiddleware<UInput & TInput, UMappedInput>,
  ) => DecoratedMiddleware<
    TInContext,
    TOutContext & UOutContext,
    UInput & TInput,
    TOutput,
    TErrorConstructorMap
  >)

  mapInput: <UInput = unknown>(
    map: MapInputMiddleware<UInput, TInput>,
  ) => DecoratedMiddleware<TInContext, TOutContext, UInput, TOutput, TErrorConstructorMap>
}

export function decorateMiddleware<
  TContext extends Context,
  TExtraContext extends Context,
  TInput,
  TOutput,
  TErrorConstructorMap extends ORPCErrorConstructorMap<any>,
>(
  middleware: Middleware<TContext, TExtraContext, TInput, TOutput, TErrorConstructorMap>,
): DecoratedMiddleware<TContext, TExtraContext, TInput, TOutput, TErrorConstructorMap> {
  const decorated = middleware as DecoratedMiddleware<TContext, TExtraContext, TInput, TOutput, TErrorConstructorMap>

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
      const next: MiddlewareNextFn<any, any> = async (nextOptions) => {
        return mapped({ ...options, context: { ...nextOptions?.context, ...options.context } }, input, output, ...rest)
      }

      const merged = middleware({ ...options, next } as any, input as any, output as any, ...rest)

      return merged
    })

    return concatted as any
  }

  return decorated
}
