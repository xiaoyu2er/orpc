import type { ANY_PROCEDURE } from '@orpc/server'
import type { Promisable } from '@orpc/shared'

export interface OpenAPITransformerMeta {
  procedure: ANY_PROCEDURE
  accept?: string
}

export interface OpenAPITransformer {
  deserialize: (input: unknown, meta: OpenAPITransformerMeta) => Promisable<unknown>
  serialize: (output: unknown, meta: OpenAPITransformerMeta) => Promisable<unknown>
}
