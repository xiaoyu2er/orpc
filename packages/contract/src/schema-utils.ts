import type { StandardSchemaV1 } from '@standard-schema/spec'

export function type<TInput, TOutput = TInput>(
  check?: (val: unknown) => StandardSchemaV1.Result<TOutput> | Promise<StandardSchemaV1.Result<TOutput>>,
): StandardSchemaV1<TInput, TOutput> {
  return {
    '~standard': {
      vendor: 'custom',
      version: 1,
      validate(value) {
        return check ? check(value) : { value: value as any }
      },
    },
  }
}
