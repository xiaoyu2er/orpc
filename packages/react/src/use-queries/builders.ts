import type { ProcedureClient, RouterClient } from '@orpc/server'
import type {} from '@tanstack/react-query'
import { createUseQueriesBuilder, type UseQueriesBuilder } from './builder'

export type UseQueriesBuilders<T extends RouterClient<any>> =
  T extends ProcedureClient<infer UInput, infer UOutput>
    ? UseQueriesBuilder<UInput, UOutput>
    : {
        [K in keyof T]: T[K] extends RouterClient<any> ? UseQueriesBuilders<T[K]> : never
      }

export interface CreateUseQueriesBuildersOptions<T extends RouterClient<any>> {
  client: T

  /**
   * The path of router on server
   */
  path?: string[]
}

export function createUseQueriesBuilders<T extends RouterClient<any>>(
  options: CreateUseQueriesBuildersOptions<T>,
): UseQueriesBuilders<T> {
  const path = options.path ?? []
  const client = options.client as any

  /**
   * For sure root is not procedure so do not create builder on root
   */
  const builder = path.length ? createUseQueriesBuilder({ client, path }) : {}

  return new Proxy(builder, {
    get(target, key) {
      const value = Reflect.get(target, key)

      if (typeof key !== 'string') {
        return value
      }

      const nextBuilders = createUseQueriesBuilders({
        client: client[key],
        path: [...path, key],
      })

      if (typeof value !== 'function') {
        return nextBuilders
      }

      return new Proxy(value, {
        get(_, key) {
          return Reflect.get(nextBuilders, key)
        },
      })
    },
  }) as any
}
