import type { ErrorMap, ErrorMapItem, ORPCErrorOptions, Schema, SchemaInput, SchemaOutput } from '@orpc/contract'
import { ORPCError } from '@orpc/contract'

export type ORPCErrorConstructorMapItemOptions<TData> = Omit<ORPCErrorOptions<any, TData>, 'defined' | 'code' | 'status'>

export type ORPCErrorConstructorMapItemRest<TData> =
  | [options: ORPCErrorConstructorMapItemOptions<TData>]
  | (undefined extends TData ? [] : never)

export type ORPCErrorConstructorMapItem<TCode extends string, TDataSchema extends Schema> =
    (...rest: ORPCErrorConstructorMapItemRest<SchemaInput<TDataSchema>>) => ORPCError<TCode, SchemaOutput<TDataSchema>>

export type ORPCErrorConstructorMap<T extends ErrorMap> =
    T extends undefined
      ? Record<string, unknown>
      : {
          [K in keyof T]: K extends string
            ? T[K] extends ErrorMapItem<infer UInputSchema>
              ? ORPCErrorConstructorMapItem<K, UInputSchema>
              : never
            : never
        }

export function createORPCErrorConstructorMap<T extends ErrorMap>(errors: T): ORPCErrorConstructorMap<T> {
  const constructors = {} as ORPCErrorConstructorMap<T>

  if (!errors) {
    return constructors
  }

  for (const code in errors) {
    const config = errors[code]

    if (!config) {
      continue
    }

    const constructor: ORPCErrorConstructorMapItem<string, Schema> = (...[options]) => {
      return new ORPCError({
        code,
        defined: true,
        status: config.status,
        message: options?.message ?? config.message,
        data: options?.data,
        cause: options?.cause,
      })
    }

    constructors[code] = constructor as any
  }

  return constructors
}
