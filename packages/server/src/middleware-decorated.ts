import type { Meta } from '@orpc/contract'
import type { Context } from './context'
import type { ORPCErrorConstructorMap } from './error'
import type { AnyMiddleware, MapInputMiddleware, Middleware, MiddlewareNextFn } from './middleware'

export interface DecoratedMiddleware<
  TInContext extends Context,
  TOutContext extends Context,
  TInput,
  TOutput,
  TErrorConstructorMap extends ORPCErrorConstructorMap<any>,
  TMetaDef extends Meta,
> extends Middleware<TInContext, TOutContext, TInput, TOutput, TErrorConstructorMap, TMetaDef> {
  concat: (<UOutContext extends Context, UInput>(
    middleware: Middleware<
      TInContext & TOutContext,
      UOutContext,
      UInput & TInput,
      TOutput,
      TErrorConstructorMap,
      TMetaDef
    >,
  ) => DecoratedMiddleware<
    TInContext,
    TOutContext & UOutContext,
    UInput & TInput,
    TOutput,
    TErrorConstructorMap,
    TMetaDef
  >) & (<
    UOutContext extends Context,
    UInput = TInput,
    UMappedInput = unknown,
  >(
    middleware: Middleware<
      TInContext & TOutContext,
      UOutContext,
      UMappedInput,
      TOutput,
      TErrorConstructorMap,
      TMetaDef
    >,
    mapInput: MapInputMiddleware<UInput & TInput, UMappedInput>,
  ) => DecoratedMiddleware<
    TInContext,
    TOutContext & UOutContext,
    UInput & TInput,
    TOutput,
    TErrorConstructorMap,
    TMetaDef
  >)

  mapInput: <UInput = unknown>(
    map: MapInputMiddleware<UInput, TInput>,
  ) => DecoratedMiddleware<TInContext, TOutContext, UInput, TOutput, TErrorConstructorMap, TMetaDef>
}

export function decorateMiddleware<
  TInContext extends Context,
  TOutContext extends Context,
  TInput,
  TOutput,
  TErrorConstructorMap extends ORPCErrorConstructorMap<any>,
  TMetaDef extends Meta,
>(
  middleware: Middleware<TInContext, TOutContext, TInput, TOutput, TErrorConstructorMap, TMetaDef>,
): DecoratedMiddleware<TInContext, TOutContext, TInput, TOutput, TErrorConstructorMap, TMetaDef> {
  const decorated = middleware as DecoratedMiddleware<TInContext, TOutContext, TInput, TOutput, TErrorConstructorMap, TMetaDef>

  decorated.mapInput = (mapInput) => {
    const mapped = decorateMiddleware(
      (options, input, ...rest) => middleware(options as any, mapInput(input as any), ...rest as [any]),
    )

    return mapped as any
  }

  decorated.concat = (concatMiddleware: AnyMiddleware, mapInput?: MapInputMiddleware<any, any>) => {
    const mapped = mapInput
      ? decorateMiddleware(concatMiddleware).mapInput(mapInput)
      : concatMiddleware

    const concatted = decorateMiddleware((options, input, output, ...rest) => {
      const next: MiddlewareNextFn<any, any> = async (...[nextOptions]) => {
        return mapped({ ...options, context: { ...nextOptions?.context, ...options.context } }, input, output, ...rest)
      }

      const merged = middleware({ ...options, next } as any, input as any, output as any, ...rest)

      return merged
    })

    return concatted as any
  }

  return decorated
}
