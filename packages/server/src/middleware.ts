import type { Context, MergeContext, Meta, Promisable } from './types'
import { mergeContext } from './utils'

export interface Middleware<
  TContext extends Context,
  TExtraContext extends Context,
  TInput,
  TOutput,
> {
  (
    input: TInput,
    context: TContext,
    meta: Meta<TOutput>,
  ): Promisable<
    TExtraContext extends undefined ? void : { context: TExtraContext }
  >
}

export interface MapInputMiddleware<TInput, TMappedInput> {
  (input: TInput): TMappedInput
}

export interface DecoratedMiddleware<
  TContext extends Context,
  TExtraContext extends Context,
  TInput,
  TOutput,
> extends Middleware<TContext, TExtraContext, TInput, TOutput> {
  concat<UExtraContext extends Context = undefined, UInput = TInput>(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      UExtraContext,
      UInput & TInput,
      TOutput
    >,
  ): DecoratedMiddleware<
    TContext,
    MergeContext<TExtraContext, UExtraContext>,
    TInput & UInput,
    TOutput
  >

  concat<
    UExtraContext extends Context = undefined,
    UInput = TInput,
    UMappedInput = unknown,
  >(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      UExtraContext,
      UMappedInput,
      TOutput
    >,
    mapInput: MapInputMiddleware<UInput, UMappedInput>,
  ): DecoratedMiddleware<
    TContext,
    MergeContext<TExtraContext, UExtraContext>,
    TInput & UInput,
    TOutput
  >

  mapInput<UInput = unknown>(
    map: MapInputMiddleware<UInput, TInput>,
  ): DecoratedMiddleware<TContext, TExtraContext, UInput, TOutput>
}

const decoratedMiddlewareSymbol = Symbol('decoratedMiddleware')

export function decorateMiddleware<
  TContext extends Context,
  TExtraContext extends Context,
  TInput,
  TOutput,
>(
  middleware: Middleware<TContext, TExtraContext, TInput, TOutput>,
): DecoratedMiddleware<TContext, TExtraContext, TInput, TOutput> {
  if (Reflect.get(middleware, decoratedMiddlewareSymbol)) {
    return middleware as any
  }

  const extended = new Proxy(middleware, {
    get(target, prop) {
      if (prop === decoratedMiddlewareSymbol) return true

      if (prop === 'concat') {
        return (
          middleware: Middleware<any, any, any, any>,
          mapInput?: MapInputMiddleware<any, any>,
        ) => {
          const middleware_ = mapInput
            ? decorateMiddleware(middleware).mapInput(mapInput)
            : middleware

          return decorateMiddleware(async (input, context, meta, ...rest) => {
            const input_ = input as any
            const context_ = context as any
            const meta_ = meta as any

            const m1 = await target(input_, context_, meta_, ...rest)
            const m2 = await middleware_(
              input_,
              mergeContext(context_, m1?.context),
              meta_,
              ...rest,
            )

            return { context: mergeContext(m1?.context, m2?.context) }
          })
        }
      }

      if (prop === 'mapInput') {
        return (mapInput: MapInputMiddleware<any, any>) => {
          return decorateMiddleware((input, ...rest: [any, any]) =>
            target(mapInput(input), ...rest),
          )
        }
      }

      return Reflect.get(target, prop)
    },
  })

  return extended as any
}
