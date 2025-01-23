import type { ContractRouter, ErrorMap, ErrorMapGuard, ErrorMapSuggestions, HTTPPath, Meta, StrictErrorMap, TypeMeta } from '@orpc/contract'
import type { Context, TypeCurrentContext, TypeInitialContext } from './context'
import type { ConflictContextGuard, MergedContext } from './context-utils'
import type { ORPCErrorConstructorMap } from './error'
import type { FlattenLazy } from './lazy-utils'
import type { AnyMiddleware, Middleware } from './middleware'
import type { Router } from './router'
import type { AdaptedRouter } from './router-utils'
import { mergePrefix, mergeTags } from '@orpc/contract'
import { lazy } from './lazy'
import { flatLazy } from './lazy-utils'
import { addMiddleware } from './middleware-utils'
import { adaptRouter } from './router-utils'

export type RouterBuilderDef<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TErrorMap extends ErrorMap,
  TMetaDef extends Meta,
> = {
  __initialContext?: TypeInitialContext<TInitialContext>
  __currentContext?: TypeCurrentContext<TCurrentContext>
  __metaDef?: TypeMeta<TMetaDef>
  prefix?: HTTPPath
  tags?: readonly string[]
  middlewares: AnyMiddleware[]
  errorMap: TErrorMap
}

export class RouterBuilder<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TErrorMap extends ErrorMap,
  TMetaDef extends Meta,
> {
  '~orpc': RouterBuilderDef<TInitialContext, TCurrentContext, TErrorMap, TMetaDef>

  constructor(def: RouterBuilderDef<TInitialContext, TCurrentContext, TErrorMap, TMetaDef>) {
    this['~orpc'] = def

    if (def.prefix && def.prefix.includes('{')) {
      throw new Error(`
        Dynamic routing in prefix not supported yet.
        Please remove "{" from "${def.prefix}".
      `)
    }
  }

  prefix(prefix: HTTPPath): RouterBuilder<TInitialContext, TCurrentContext, TErrorMap, TMetaDef> {
    return new RouterBuilder({
      ...this['~orpc'],
      prefix: mergePrefix(this['~orpc'].prefix, prefix),
    })
  }

  tag(...tags: string[]): RouterBuilder<TInitialContext, TCurrentContext, TErrorMap, TMetaDef> {
    return new RouterBuilder({
      ...this['~orpc'],
      tags: mergeTags(this['~orpc'].tags, tags),
    })
  }

  errors<U extends ErrorMap & ErrorMapGuard<TErrorMap> & ErrorMapSuggestions>(
    errors: U,
  ): RouterBuilder<TInitialContext, TCurrentContext, StrictErrorMap<U> & TErrorMap, TMetaDef> {
    return new RouterBuilder({
      ...this['~orpc'],
      errorMap: {
        ...this['~orpc'].errorMap,
        ...errors,
      },
    })
  }

  use<U extends Context>(
    middleware: Middleware<
      TCurrentContext,
      U,
      unknown,
      unknown,
      ORPCErrorConstructorMap<TErrorMap>,
      TMetaDef
    >,
  ): ConflictContextGuard<MergedContext<TCurrentContext, U>>
    & RouterBuilder<TInitialContext, MergedContext<TCurrentContext, U>, TErrorMap, TMetaDef> {
    const builder = new RouterBuilder({
      ...this['~orpc'],
      middlewares: addMiddleware(this['~orpc'].middlewares, middleware),
    })

    return builder as any
  }

  router<U extends Router<TCurrentContext, ContractRouter<ErrorMap & Partial<TErrorMap>, TMetaDef>>>(
    router: U,
  ): AdaptedRouter<U, TInitialContext, TErrorMap> {
    return adaptRouter(router, this['~orpc'])
  }

  lazy<U extends Router<TCurrentContext, ContractRouter<ErrorMap & Partial<TErrorMap>, TMetaDef>>>(
    loader: () => Promise<{ default: U }>,
  ): AdaptedRouter<FlattenLazy<U>, TInitialContext, TErrorMap> {
    return adaptRouter(flatLazy(lazy(loader)), this['~orpc'])
  }
}
