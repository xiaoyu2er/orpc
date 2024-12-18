import type { SchemaInput, SchemaOutput } from '@orpc/contract'
import type { AnyFunction } from '@orpc/shared'
import type { ANY_LAZY, Lazy } from './lazy'
import type { Procedure } from './procedure'
import type { Caller } from './types'
import { flatLazy, lazy, unwrapLazy } from './lazy'
import { createProcedureCaller } from './procedure-caller'

export type DecoratedLazy<T> = T extends Lazy<infer U>
  ? DecoratedLazy<U>
  : (
      T extends Procedure<infer UContext, any, infer UInputSchema, infer UOutputSchema, infer UFuncOutput> ?
      & Lazy<T>
      & (undefined extends UContext ? Caller<SchemaInput<UInputSchema>, SchemaOutput<UOutputSchema, UFuncOutput>> : unknown)
        : T extends AnyFunction ? Lazy<T>
          : T extends object ? {
            [K in keyof T & string]: DecoratedLazy<T[K]>
          } & Lazy<T>
            : Lazy<T>
    )

export function decorateLazy<T extends ANY_LAZY>(lazied: T): DecoratedLazy<T> {
  const flattenLazy = flatLazy(lazied)

  const procedureCaller = createProcedureCaller({
    procedure: flattenLazy as any,
    context: undefined as any,
  })

  Object.assign(procedureCaller, flattenLazy)

  const recursive = new Proxy(procedureCaller, {
    get(target, key) {
      if (typeof key !== 'string') {
        return Reflect.get(target, key)
      }

      return decorateLazy(lazy(async () => {
        const current = await unwrapLazy(flattenLazy)
        return { default: (current.default as any)[key] }
      }))
    },
  })

  return recursive as any
}
