import type { IsEqual, Promisable } from '@orpc/shared'
import type { StandardSchemaV1 } from '@standard-schema/spec'

export type Schema<TInput, TOutput> = StandardSchemaV1<TInput, TOutput>

export type AnySchema = Schema<any, any>

export type InferSchemaInput<T extends AnySchema> = T extends StandardSchemaV1<infer UInput, any> ? UInput : never

export type InferSchemaOutput<T extends AnySchema> = T extends StandardSchemaV1<any, infer UOutput> ? UOutput : never

export type TypeRest<TInput, TOutput> =
  | [map: (input: TInput) => Promisable<TOutput>]
  | (IsEqual<TInput, TOutput> extends true ? [] : never)

export function type<TInput, TOutput = TInput>(...[map]: TypeRest<TInput, TOutput>): Schema<TInput, TOutput> {
  return {
    '~standard': {
      vendor: 'custom',
      version: 1,
      async validate(value) {
        if (map) {
          return { value: await map(value as TInput) as TOutput }
        }

        return { value: value as TOutput }
      },
    },
  }
}
