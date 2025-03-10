import type { AnyContractRouter, ContractProcedure, InferContractRouterErrorMap, InferContractRouterMeta } from '@orpc/contract'
import type { ConflictContextGuard, Context, MergedContext } from './context'
import type { ORPCErrorConstructorMap } from './error'
import type { ProcedureImplementer } from './implementer-procedure'
import type { ImplementerInternalWithMiddlewares } from './implementer-variants'
import type { Lazy } from './lazy'
import type { AnyMiddleware, Middleware } from './middleware'
import type { AnyRouter, Router } from './router'
import { isContractProcedure } from '@orpc/contract'
import { Builder, type BuilderConfig } from './builder'
import { fallbackConfig } from './config'
import { lazy } from './lazy'
import { type DecoratedMiddleware, decorateMiddleware } from './middleware-decorated'
import { addMiddleware } from './middleware-utils'
import { setHiddenRouterContract } from './router-hidden'
import { type EnhancedRouter, enhanceRouter } from './router-utils'

export interface RouterImplementer<
  T extends AnyContractRouter,
  TInitialContext extends Context,
  TCurrentContext extends Context,
> {
  middleware<UOutContext extends Context, TInput, TOutput = any>( // = any here is important to make middleware can be used in any output by default
    middleware: Middleware<
      TCurrentContext,
      UOutContext,
      TInput,
      TOutput,
      ORPCErrorConstructorMap<InferContractRouterErrorMap<T>>,
      InferContractRouterMeta<T>
    >,
  ): DecoratedMiddleware<TCurrentContext, UOutContext, TInput, TOutput, ORPCErrorConstructorMap<any>, InferContractRouterMeta<T>> // ORPCErrorConstructorMap<any> ensures middleware can used in any procedure

  use<U extends Context>(
    middleware: Middleware<
      TCurrentContext,
      U,
      unknown,
      unknown,
      ORPCErrorConstructorMap<InferContractRouterErrorMap<T>>,
      InferContractRouterMeta<T>
    >,
  ): ConflictContextGuard<MergedContext<TCurrentContext, U>>
    & ImplementerInternalWithMiddlewares<T, TInitialContext, MergedContext<TCurrentContext, U>>

  router<U extends Router<T, TCurrentContext>>(
    router: U): EnhancedRouter<U, TInitialContext, Record<never, never>>

  lazy<U extends Router<T, TCurrentContext>>(
    loader: () => Promise<{ default: U }>
  ): EnhancedRouter<Lazy<U>, TInitialContext, Record<never, never>>
}

export type ImplementerInternal<
  TContract extends AnyContractRouter,
  TInitialContext extends Context,
  TCurrentContext extends Context,
> =
  &(
    TContract extends ContractProcedure<infer UInputSchema, infer UOutputSchema, infer UErrorMap, infer UMeta>
      ? ProcedureImplementer<TInitialContext, TCurrentContext, UInputSchema, UOutputSchema, UErrorMap, UMeta>
      : RouterImplementer<TContract, TInitialContext, TCurrentContext> & {
        [K in keyof TContract]: TContract[K] extends AnyContractRouter
          ? ImplementerInternal<TContract[K], TInitialContext, TCurrentContext>
          : never
      }
   )

export function implementerInternal<
  TContract extends AnyContractRouter,
  TInitialContext extends Context,
  TCurrentContext extends Context,
>(
  contract: TContract,
  config: BuilderConfig,
  middlewares: AnyMiddleware[],
): ImplementerInternal<TContract, TInitialContext, TCurrentContext> {
  if (isContractProcedure(contract)) {
    const impl = new Builder({
      ...contract['~orpc'],
      config,
      middlewares,
      inputValidationIndex: fallbackConfig('initialInputValidationIndex', config?.initialInputValidationIndex) + middlewares.length,
      outputValidationIndex: fallbackConfig('initialOutputValidationIndex', config?.initialOutputValidationIndex) + middlewares.length,
    })

    return impl as any
  }

  const impl = new Proxy(contract, {
    get: (target, key) => {
      let method: any

      if (key === 'middleware') {
        method = (mid: any) => decorateMiddleware(mid)
      }
      else if (key === 'use') {
        method = (mid: any) => {
          return implementerInternal(
            contract,
            config,
            addMiddleware(middlewares, mid),
          )
        }
      }
      else if (key === 'router') {
        method = (router: any) => {
          const adapted = enhanceRouter(router, {
            middlewares,
            errorMap: {},
            prefix: undefined,
            tags: undefined,
          })

          return setHiddenRouterContract(adapted, contract)
        }
      }
      else if (key === 'lazy') {
        method = (loader: () => Promise<{ default: AnyRouter }>) => {
          const adapted = enhanceRouter(lazy(loader) as any, {
            middlewares,
            errorMap: {},
            prefix: undefined,
            tags: undefined,
          })

          return setHiddenRouterContract(adapted, contract)
        }
      }

      const next = Reflect.get(target, key)

      if (!next || (typeof next !== 'function' && typeof next !== 'object')) {
        return method ?? next
      }

      const nextImpl = implementerInternal(next as any, config, middlewares)

      if (method) {
        return new Proxy(method, {
          get(_, key) {
            return Reflect.get(nextImpl, key)
          },
        })
      }

      return nextImpl
    },
  })

  return impl as any
}

export type Implementer<
  TContract extends AnyContractRouter,
  TInitialContext extends Context,
  TCurrentContext extends Context ,
> =
  & {
    $context<U extends Context>(): Implementer<TContract, U, U>
    $config(config: BuilderConfig): Implementer<TContract, TInitialContext, TCurrentContext>
  }
  & ImplementerInternal<TContract, TInitialContext, TCurrentContext>

export function implement<
  TContract extends AnyContractRouter,
  TInitialContext extends Context,
  TCurrentContext extends Context,
>(
  contract: TContract,
  config: BuilderConfig = {},
): Implementer<TContract, TInitialContext, TCurrentContext> {
  const implInternal = implementerInternal(contract, config, [])

  const impl = new Proxy(implInternal, {
    get: (target, key) => {
      let method: any

      if (key === '$context') {
        method = () => impl
      }
      else if (key === '$config') {
        method = (config: BuilderConfig) => implement(contract, config)
      }

      const next = Reflect.get(target, key)

      if (!next || (typeof next !== 'function' && typeof next !== 'object')) {
        return method ?? next
      }

      if (method) {
        return new Proxy(method, {
          get(_, key) {
            return Reflect.get(next, key)
          },
        })
      }

      return next
    },
  })

  return impl as any
}
