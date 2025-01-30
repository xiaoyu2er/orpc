import type { AnyContractRouter, ContractProcedure, ContractRouter, ContractRouterToErrorMap, ContractRouterToMeta, ORPCErrorConstructorMap } from '@orpc/contract'
import type { ConflictContextGuard, Context, MergedContext } from './context'
import type { ProcedureImplementer } from './implementer-procedure'
import type { ImplementerInternalWithMiddlewares } from './implementer-variants'
import type { AnyMiddleware, Middleware } from './middleware'
import { isContractProcedure } from '@orpc/contract'
import { Builder, type BuilderConfig } from './builder'
import { fallbackConfig } from './config'
import { setRouterContract } from './hidden'
import { lazy } from './lazy'
import { flatLazy, type FlattenLazy } from './lazy-utils'
import { type DecoratedMiddleware, decorateMiddleware } from './middleware-decorated'
import { addMiddleware } from './middleware-utils'
import { type AdaptedRouter, adaptRouter, type Router } from './router'

export type ImplementerInternal<
  TContract extends AnyContractRouter,
  TInitialContext extends Context,
  TCurrentContext extends Context,
> =
  &(
    TContract extends ContractProcedure<infer UInputSchema, infer UOutputSchema, infer UErrorMap, infer UMeta>
      ? ProcedureImplementer<TInitialContext, TCurrentContext, UInputSchema, UOutputSchema, UErrorMap, UMeta>
      : TContract extends ContractRouter<infer UMeta> ? {
        middleware<UOutContext extends Context, TInput, TOutput = any>(
          middleware: Middleware<
            TCurrentContext,
            UOutContext,
            TInput,
            TOutput,
            ORPCErrorConstructorMap<ContractRouterToErrorMap<TContract>>,
            ContractRouterToMeta<TContract>
          >,
        ): DecoratedMiddleware<TCurrentContext, UOutContext, TInput, TOutput, ORPCErrorConstructorMap<any>, UMeta>

        use<U extends Context>(
          middleware: Middleware<
            TCurrentContext,
            U,
            unknown,
            unknown,
            ORPCErrorConstructorMap<ContractRouterToErrorMap<TContract>>,
            UMeta
          >,
        ): ConflictContextGuard<MergedContext<TCurrentContext, U>>
          & ImplementerInternalWithMiddlewares<TContract, TInitialContext, MergedContext<TCurrentContext, U>>

        router<U extends Router<TCurrentContext, TContract>>(router: U): AdaptedRouter<U, TInitialContext, Record<never, never>>

        lazy<U extends Router<TCurrentContext, TContract>>(
          loader: () => Promise<{ default: U }>
        ): AdaptedRouter<FlattenLazy<U>, TInitialContext, Record<never, never>>
      } & {
        [K in keyof TContract]: TContract[K] extends AnyContractRouter
          ? ImplementerInternal<TContract[K], TInitialContext, TCurrentContext>
          : never
      } : never
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
          const adapted = adaptRouter(router, {
            middlewares,
            errorMap: {},
          })

          return setRouterContract(adapted, contract)
        }
      }
      else if (key === 'lazy') {
        method = (loader: any) => {
          const adapted = adaptRouter(flatLazy(lazy(loader)) as any, {
            middlewares,
            errorMap: {},
          })

          return setRouterContract(adapted, contract)
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
