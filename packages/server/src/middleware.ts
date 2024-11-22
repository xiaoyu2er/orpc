import type { Promisable } from '@orpc/shared'
import type { Context, MergeContext, Meta } from './types'
import { mergeContext } from './utils'

export type MiddlewareResult<TExtraContext extends Context, TOutput> = Promisable<{
  output: TOutput
  context: TExtraContext
}>

export interface MiddlewareMeta<
  TOutput,
> extends Meta {
  next: <UExtraContext extends Context = undefined>(
    options: UExtraContext extends undefined ? { context?: UExtraContext } : { context: UExtraContext }
  ) => MiddlewareResult<UExtraContext, TOutput>
  output: <UOutput>(output: UOutput) => MiddlewareResult<undefined, UOutput>
}

export interface Middleware<
  TContext extends Context,
  TExtraContext extends Context,
  TInput,
  TOutput,
> {
  (
    input: TInput,
    context: TContext,
    meta: MiddlewareMeta<TOutput>,
  ): Promisable<
    MiddlewareResult<TExtraContext, TOutput>
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
  concat: (<
    UExtraContext extends Partial<MergeContext<Context, MergeContext<TContext, TExtraContext>>> | undefined = undefined,
    UInput = TInput,
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
    TInput & UInput,
    TOutput
  >) & (<
    UExtraContext extends Partial<MergeContext<Context, MergeContext<TContext, TExtraContext>>> | undefined = undefined,
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
  ) => DecoratedMiddleware<
    TContext,
    MergeContext<TExtraContext, UExtraContext>,
    TInput & UInput,
    TOutput
  >)

  mapInput: <UInput = unknown>(
    map: MapInputMiddleware<UInput, TInput>,
  ) => DecoratedMiddleware<TContext, TExtraContext, UInput, TOutput>
}

const decoratedMiddlewareSymbol = Symbol('🔒decoratedMiddleware')

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

  const concat = (
    concatMiddleware: Middleware<any, any, any, any>,
    mapInput?: MapInputMiddleware<any, any>,
  ): Middleware<any, any, any, any> => {
    const concatMiddleware_ = mapInput
      ? decorateMiddleware(concatMiddleware).mapInput(mapInput)
      : concatMiddleware

    return decorateMiddleware(async (input, context, meta, ...rest) => {
      const input_ = input as any
      const context_ = context as any
      const meta_ = meta as any

      const next: MiddlewareMeta<any>['next'] = async (options) => {
        return concatMiddleware_(input_, mergeContext(context_, options.context), meta_, ...rest)
      }

      const m1 = await middleware(input_, context_, {
        ...meta_,
        next,
      }, ...rest)

      return m1
    })
  }

  const mapInput = <UInput = unknown>(
    map: MapInputMiddleware<UInput, TInput>,
  ): DecoratedMiddleware<TContext, TExtraContext, UInput, TOutput> => {
    return decorateMiddleware((input, ...rest) =>
      middleware(map(input), ...rest),
    )
  }

  return Object.assign(middleware, {
    [decoratedMiddlewareSymbol]: true,
    concat: concat as any,
    mapInput,
  })
}
