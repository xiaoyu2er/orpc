import type { Context, MergedContext } from './context'
import type { AnyMiddleware, MapInputMiddleware, Middleware } from './middleware'
import { type ErrorMap, type MergedErrorMap, mergeErrorMap, type Meta } from '@orpc/contract'

export interface DecoratedMiddleware<
  TInContext extends Context,
  TOutContext extends Context,
  TInput,
  TOutput,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> extends Middleware<TInContext, TOutContext, TInput, TOutput, TErrorMap, TMeta> {
  errors<U extends ErrorMap>(
    errors: U,
  ): DecoratedMiddleware<TInContext, TOutContext, TInput, TOutput, MergedErrorMap<TErrorMap, U>, TMeta>

  mapInput<UInput>(
    map: MapInputMiddleware<UInput, TInput>,
  ): DecoratedMiddleware<TInContext, TOutContext, UInput, TOutput, TErrorMap, TMeta>

  concat<UOutContext extends Context, UInput, UErrorMap extends ErrorMap = TErrorMap>(
    middleware: Middleware<
      TInContext & TOutContext,
      UOutContext,
      UInput & TInput,
      TOutput,
      UErrorMap,
      TMeta
    >,
  ): DecoratedMiddleware<
    TInContext,
    MergedContext<TOutContext, UOutContext>,
    UInput & TInput,
    TOutput,
    MergedErrorMap<TErrorMap, UErrorMap>,
    TMeta
  >

  concat<
    UOutContext extends Context,
    UMappedInput,
    UErrorMap extends ErrorMap = TErrorMap,
  >(
    middleware: Middleware<
      TInContext & TOutContext,
      UOutContext,
      UMappedInput,
      TOutput,
      UErrorMap,
      TMeta
    >,
    mapInput: MapInputMiddleware<TInput, UMappedInput>,
  ): DecoratedMiddleware<
    TInContext,
    MergedContext<TOutContext, UOutContext>,
    TInput,
    TOutput,
    MergedErrorMap<TErrorMap, UErrorMap>,
    TMeta
  >
}

export function decorateMiddleware<
  TInContext extends Context,
  TOutContext extends Context,
  TInput,
  TOutput,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
>(
  middleware: Middleware<TInContext, TOutContext, TInput, TOutput, TErrorMap, TMeta>,
): DecoratedMiddleware<TInContext, TOutContext, TInput, TOutput, TErrorMap, TMeta> {
  const decorated = middleware as DecoratedMiddleware<TInContext, TOutContext, TInput, TOutput, TErrorMap, TMeta>

  decorated.errors = (errors) => {
    const cloned = decorateMiddleware(
      (...args) => decorated(...args as [any, any, any]),
    )

    cloned['~orpcErrorMap'] = mergeErrorMap(decorated['~orpcErrorMap'] ?? {}, errors)

    return cloned as any
  }

  decorated.mapInput = (mapInput) => {
    const mapped = decorateMiddleware(
      (options, input, ...rest) => middleware(options as any, mapInput(input as any), ...rest as [any]),
    )

    mapped['~orpcErrorMap'] = decorated['~orpcErrorMap']

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

    concatted['~orpcErrorMap'] = mergeErrorMap(decorated['~orpcErrorMap'] ?? {}, mapped['~orpcErrorMap'] ?? {})

    return concatted as any
  }

  return decorated
}
