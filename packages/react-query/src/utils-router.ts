import type { ContractProcedure, ContractRouter, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { Lazy, Procedure, Router } from '@orpc/server'
import { createGeneralUtils, type GeneralUtils } from './utils-general'
import { createProcedureUtils, type ProcedureUtils } from './utils-procedure'

export type RouterUtils<T extends Router<any> | ContractRouter> = {
  [K in keyof T]: T[K] extends
  | ContractProcedure<infer UInputSchema, infer UOutputSchema>
  | Procedure<any, any, infer UInputSchema, infer UOutputSchema, infer UFuncOutput>
  | Lazy<Procedure<any, any, infer UInputSchema, infer UOutputSchema, infer UFuncOutput>>
    ?
    & ProcedureUtils<SchemaInput<UInputSchema>, SchemaOutput<UOutputSchema, UFuncOutput>>
    & GeneralUtils<SchemaInput<UInputSchema>>
    : T[K] extends Router<any> | ContractRouter
      ? RouterUtils<T[K]>
      : never
}

export interface CreateRouterUtilsOptions<_T extends Router<any> | ContractRouter> {
  prefix: string
  client: any // TODO
}

export function createRouterUtils<T extends Router<any> | ContractRouter>(
  options: CreateRouterUtilsOptions<T>,
): RouterUtils<T> {
  const generalUtils = createGeneralUtils(options.prefix, []) // TODO
  const procedureUtils = createProcedureUtils(options.prefix, options.client)

  const recursive = new Proxy({
    ...generalUtils,
    ...procedureUtils,
  }, {
    get(target, prop) {
      const value = Reflect.get(target, prop)

      if (typeof prop !== 'string') {
        return value
      }

      const nextUtils = createRouterUtils({
        prefix: options.prefix,
        client: options.client[prop],
      })

      if (typeof value !== 'function') {
        return nextUtils
      }

      return new Proxy(value, {
        get(_, prop) {
          return Reflect.get(nextUtils, prop)
        },
      })
    },
  })

  return recursive as any
}
