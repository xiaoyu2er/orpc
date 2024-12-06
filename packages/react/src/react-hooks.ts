import type {
  ContractProcedure,
  ContractRouter,
  SchemaOutput,
} from '@orpc/contract'
import type { Lazy, Procedure, Router } from '@orpc/server'
import type { ORPCContext } from './react-context'
import { createGeneralHooks, type GeneralHooks } from './general-hooks'
import { orpcPathSymbol } from './orpc-path'
import { createProcedureHooks, type ProcedureHooks } from './procedure-hooks'

export type ORPCHooksWithContractRouter<TRouter extends ContractRouter> = {
  [K in keyof TRouter]: TRouter[K] extends ContractProcedure<
    infer UInputSchema,
    infer UOutputSchema
  >
    ? ProcedureHooks<UInputSchema, UOutputSchema, SchemaOutput<UOutputSchema>> & GeneralHooks<UInputSchema, UOutputSchema, SchemaOutput<UOutputSchema>>
    : TRouter[K] extends ContractRouter
      ? ORPCHooksWithContractRouter<TRouter[K]>
      : never
} & GeneralHooks<undefined, undefined, unknown>

export type ORPCHooksWithRouter<TRouter extends Router<any>> = {
  [K in keyof TRouter]: TRouter[K] extends
  | Procedure<any, any, infer UInputSchema, infer UOutputSchema, infer UFuncOutput>
  | Lazy<Procedure<any, any, infer UInputSchema, infer UOutputSchema, infer UFuncOutput>>
    ? ProcedureHooks<UInputSchema, UOutputSchema, UFuncOutput> & GeneralHooks<UInputSchema, UOutputSchema, UFuncOutput>
    : TRouter[K] extends Router<any>
      ? ORPCHooksWithRouter<TRouter[K]>
      : never
} & GeneralHooks<undefined, undefined, unknown>

export interface CreateORPCHooksOptions<
  TRouter extends ContractRouter | Router<any>,
> {
  context: ORPCContext<TRouter>

  /**
   * The path of the router.
   *
   * @internal
   */
  path?: string[]
}

export function createORPCHooks<TRouter extends ContractRouter | Router<any>>(
  options: CreateORPCHooksOptions<TRouter>,
): TRouter extends Router<any>
    ? ORPCHooksWithRouter<TRouter>
    : TRouter extends ContractRouter
      ? ORPCHooksWithContractRouter<TRouter>
      : never {
  const path = options.path ?? []
  const generalHooks = createGeneralHooks({ context: options.context, path })

  // for sure root is not procedure, so do not it procedure hooks on root
  const procedureHooks = path.length
    ? createProcedureHooks({
      context: options.context,
      path,
    })
    : {}

  return new Proxy(
    {
      [orpcPathSymbol]: path,

      ...generalHooks,
      ...procedureHooks,
    },
    {
      get(target, key) {
        const value = Reflect.get(target, key)

        if (typeof key !== 'string') {
          return value
        }

        const nextHooks = createORPCHooks({
          context: options.context,
          path: [...path, key],
        })

        if (typeof value !== 'function') {
          return nextHooks
        }

        return new Proxy(value, {
          get(_, key) {
            return Reflect.get(nextHooks, key)
          },
        })
      },
    },
  ) as any
}
