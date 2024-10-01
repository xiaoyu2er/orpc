import type { Schema } from '@orpc/contract'
import type { SchemaObject } from 'openapi3-ts/oas31'
import { omit } from 'radash'
import zodToJsonSchema from 'zod-to-json-schema'

export function schemaToJsonSchema(schema: Schema): SchemaObject {
  return schema
    ? (omit(zodToJsonSchema(schema), ['$schema']) as SchemaObject)
    : {}
}
