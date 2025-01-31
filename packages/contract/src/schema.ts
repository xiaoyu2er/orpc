import type { IsEqual, Promisable } from '@orpc/shared'
import type { StandardSchemaV1 } from '@standard-schema/spec'

export type Schema = StandardSchemaV1 | undefined

export type SchemaInput<
  TSchema extends Schema,
  TFallback = unknown,
> = TSchema extends undefined
  ? TFallback
  : TSchema extends StandardSchemaV1
    ? StandardSchemaV1.InferInput<TSchema>
    : TFallback

export type SchemaOutput<
  TSchema extends Schema,
  TFallback = unknown,
> = TSchema extends undefined
  ? TFallback
  : TSchema extends StandardSchemaV1
    ? StandardSchemaV1.InferOutput<TSchema>
    : TFallback

export type TypeRest<TInput, TOutput> =
  | [map: (input: TInput) => Promisable<TOutput>]
  | (IsEqual<TInput, TOutput> extends true ? [] : never)

export function type<TInput, TOutput = TInput>(...[map]: TypeRest<TInput, TOutput>): StandardSchemaV1<TInput, TOutput> {
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
