import type { Meta } from '@orpc/contract'
import type { Context, MergedCurrentContext, MergedInitialContext } from './context'
import type { ORPCErrorConstructorMap } from './error'
import type { AnyMiddleware, MapInputMiddleware, Middleware } from './middleware'

export interface DecoratedMiddleware<
  TInContext extends Context,
  TOutContext extends Context,
  TInput,
  TOutput,
  TErrorConstructorMap extends ORPCErrorConstructorMap<any>,
  TMeta extends Meta,
> extends Middleware<TInContext, TOutContext, TInput, TOutput, TErrorConstructorMap, TMeta> {
  mapInput<UInput>(
    map: MapInputMiddleware<UInput, TInput>,
  ): DecoratedMiddleware<TInContext, TOutContext, UInput, TOutput, TErrorConstructorMap, TMeta>

  concat<
    UOutContext extends Context,
    UInContext extends Context = MergedCurrentContext<TInContext, TOutContext>,
  >(
    middleware: Middleware<
      UInContext | MergedCurrentContext<TInContext, TOutContext>,
      UOutContext,
      TInput,
      TOutput,
      TErrorConstructorMap,
      TMeta
    >,
  ): DecoratedMiddleware<
    MergedInitialContext<TInContext, UInContext, MergedCurrentContext<TInContext, TOutContext>>,
    MergedCurrentContext<TOutContext, UOutContext>,
    TInput,
    TOutput,
    TErrorConstructorMap,
    TMeta
  >

  concat<
    UOutContext extends Context,
    UMappedInput,
    UInContext extends Context = MergedCurrentContext<TInContext, TOutContext>,
  >(
    middleware: Middleware<
      UInContext | MergedCurrentContext<TInContext, TOutContext>,
      UOutContext,
      UMappedInput,
      TOutput,
      TErrorConstructorMap,
      TMeta
    >,
    mapInput: MapInputMiddleware<TInput, UMappedInput>,
  ): DecoratedMiddleware<
    MergedInitialContext<TInContext, UInContext, MergedCurrentContext<TInContext, TOutContext>>,
    MergedCurrentContext<TOutContext, UOutContext>,
    TInput,
    TOutput,
    TErrorConstructorMap,
    TMeta
  >
}

export function decorateMiddleware<
  TInContext extends Context,
  TOutContext extends Context,
  TInput,
  TOutput,
  TErrorConstructorMap extends ORPCErrorConstructorMap<any>,
  TMeta extends Meta,
>(
  middleware: Middleware<TInContext, TOutContext, TInput, TOutput, TErrorConstructorMap, TMeta>,
): DecoratedMiddleware<TInContext, TOutContext, TInput, TOutput, TErrorConstructorMap, TMeta> {
  const decorated = ((...args) => middleware(...args)) as DecoratedMiddleware<TInContext, TOutContext, TInput, TOutput, TErrorConstructorMap, TMeta>

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
      const merged = middleware({
        ...options,
        next: (...[nextOptions1]: [any]) => mapped({
          ...options,
          context: { ...options.context, ...nextOptions1?.context },
          next: (...[nextOptions2]) => options.next({ context: { ...nextOptions1?.context, ...nextOptions2?.context } }) as any,
        }, input, output, ...rest),
      } as any, input as any, output as any, ...rest)

      return merged
    })

    return concatted as any
  }

  return decorated
}
