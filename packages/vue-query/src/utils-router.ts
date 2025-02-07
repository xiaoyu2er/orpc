import type { Client, NestedClient } from '@orpc/contract'
import { createProcedureUtils, type ProcedureUtils } from './procedure-utils'
import { createGeneralUtils, type GeneralUtils } from './utils-general'

export type RouterUtils<T extends NestedClient<any>> =
  T extends Client<infer TClientContext, infer UInput, infer UOutput, infer UError>
    ? ProcedureUtils<TClientContext, UInput, UOutput, UError> & GeneralUtils<UInput>
    : {
      [K in keyof T]: T[K] extends NestedClient<any> ? RouterUtils<T[K]> : never
    } & GeneralUtils<unknown>

/**
 * @param client - The client create form `@orpc/client`
 * @param path - The base path for query key
 */
export function createRouterUtils<T extends NestedClient<any>>(
  client: T,
  path: string[] = [],
): RouterUtils<T> {
  const generalUtils = createGeneralUtils(path)
  const procedureUtils = createProcedureUtils(client as any, path)

  const recursive = new Proxy({
    ...generalUtils,
    ...procedureUtils,
  }, {
    get(target, prop) {
      const value = Reflect.get(target, prop)

      if (typeof prop !== 'string') {
        return value
      }

      const nextUtils = createRouterUtils((client as any)[prop], [...path, prop])

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
