import type { AnyContractRouter, ContractProcedure, InterContractRouterErrorMap, InterContractRouterMeta, Lazy, Lazyable } from '@orpc/contract'
import type { ConflictContextGuard, Context, MergedContext } from './context'
import type { ORPCErrorConstructorMap } from './error'
import type { ProcedureImplementer } from './implementer-procedure'
import type { ImplementerInternalWithMiddlewares } from './implementer-variants'
import type { AnyMiddleware, Middleware } from './middleware'
import type { AnyRouter, Router } from './router'
import { createAssertedDefinedLazy, getContractRouter, isContractProcedure, isLazy, lazy, setHiddenRouterContract } from '@orpc/contract'
import { Builder, type BuilderConfig } from './builder'
import { fallbackConfig } from './config'
import { type DecoratedMiddleware, decorateMiddleware } from './middleware-decorated'
import { addMiddleware } from './middleware-utils'
import { type EnhancedRouter, enhanceRouter } from './router-utils'
import { AnyFunction } from '@orpc/shared'

export interface RouterImplementer<
  TContract extends AnyContractRouter,
  TInitialContext extends Context,
  TCurrentContext extends Context,
> {
  middleware<UOutContext extends Context, TInput, TOutput = any>( // = any here is important to make middleware can be used in any output by default
    middleware: Middleware<
      TCurrentContext,
      UOutContext,
      TInput,
      TOutput,
      ORPCErrorConstructorMap<InterContractRouterErrorMap<TContract>>,
      InterContractRouterMeta<TContract>
    >,
  ): DecoratedMiddleware<TCurrentContext, UOutContext, TInput, TOutput, ORPCErrorConstructorMap<any>, InterContractRouterMeta<TContract>> // ORPCErrorConstructorMap<any> ensures middleware can used in any procedure

  use<U extends Context>(
    middleware: Middleware<
      TCurrentContext,
      U,
      unknown,
      unknown,
      ORPCErrorConstructorMap<InterContractRouterErrorMap<TContract>>,
      InterContractRouterMeta<TContract>
    >,
  ): ConflictContextGuard<MergedContext<TCurrentContext, U>>
    & ImplementerInternalWithMiddlewares<TContract, TInitialContext, MergedContext<TCurrentContext, U>>

  router<U extends Router<TContract, TCurrentContext>>(
    router: U): EnhancedRouter<U, TInitialContext, Record<never, never>>

  lazy<U extends Router<TContract, TCurrentContext>>(
    loader: () => Promise<{ default: U }>
  ): EnhancedRouter<Lazy<U>, TInitialContext, Record<never, never>>
}

export type ImplementerInternal<T extends AnyContractRouter, TInitialContext extends Context, TCurrentContext extends Context> =
T extends ContractProcedure<infer UInputSchema, infer UOutputSchema, infer UErrorMap, infer UMeta>
  ? ProcedureImplementer<TInitialContext, TCurrentContext, UInputSchema, UOutputSchema, UErrorMap, UMeta>
  : RouterImplementer<T, TInitialContext, TCurrentContext> & {
    [K in keyof T]: T[K] extends Lazyable<infer U extends AnyContractRouter>
      ? ImplementerInternal<U, TInitialContext, TCurrentContext>
      : never
  }

export function implementerInternal<T extends AnyContractRouter,
  TInitialContext extends Context,
  TCurrentContext extends Context,
>(
  contract: Lazyable<T>,
  config: BuilderConfig,
  middlewares: AnyMiddleware[],
): ImplementerInternal<T, TInitialContext, TCurrentContext> {
  if (isContractProcedure(contract)) {
    const impl = new Builder({
      ...contract['~orpc'],
      config,
      middlewares,
      inputValidationIndex: fallbackConfig('initialInputValidationIndex', config?.initialInputValidationIndex) + middlewares.length,
      outputValidationIndex: fallbackConfig('initialOutputValidationIndex', config?.initialOutputValidationIndex) + middlewares.length,
      tags: [],
      prefix: undefined,
    })

    return impl as any
  }

  const impl = new Proxy(contract, {
    get: (target, key) => {
      if (typeof key !== 'string') {
        return Reflect.get(target, key)
      }

      let method: AnyFunction | undefined

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
          const enhanced = enhanceRouter(router, {
            middlewares,
            errorMap: {},
            prefix: undefined,
            tags: [],
          })

          return setHiddenRouterContract(enhanced, contract)
        }
      }
      else if (key === 'lazy') {
        method = (loader: () => Promise<{ default: AnyRouter }>) => {
          const enhanced = enhanceRouter(lazy(loader, { prefix: undefined }), {
            middlewares,
            errorMap: {},
            prefix: undefined,
            tags: [],
          })

          return setHiddenRouterContract(enhanced, contract)
        }
      }

      const next = getContractRouter(target, [key])

      if (!next) {
        return method ?? next
      }

      const assertedNext = isLazy(next) ? createAssertedDefinedLazy(next)   : next as Exclude<typeof next, Lazy<any>>

      const nextImpl = implementerInternal(assertedNext, config, middlewares)

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
