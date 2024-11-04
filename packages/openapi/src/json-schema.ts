import type { Schema } from '@orpc/contract'
import { getCustomZodFileMimeType, getCustomZodType } from '@orpc/zod'
import { ZodFirstPartyTypeKind } from 'zod'
import zodToJsonSchema, {
  ignoreOverride,
  type JsonSchema7Type,
} from 'zod-to-json-schema'

export type JsonSchema = JsonSchema7Type & {
  $schema?: string | undefined
  definitions?:
    | {
        [key: string]: JsonSchema7Type
      }
    | undefined
}

export function schemaToJsonSchema(schema: Schema): JsonSchema {
  if (!schema) return {}

  const jsonSchema = zodToJsonSchema(schema, {
    override(def) {
      const customZodType = getCustomZodType(def)

      if (customZodType === 'Blob') {
        return {
          type: 'string',
          contentMediaType: '*/*',
        }
      }

      if (customZodType === 'File') {
        const mimeType = getCustomZodFileMimeType(def) ?? '*/*'

        return {
          type: 'string',
          contentMediaType: mimeType,
        }
      }

      if (customZodType === 'Invalid Date') {
        return {
          type: 'string',
          const: 'Invalid Date',
        }
      }

      if (customZodType === 'RegExp') {
        return {
          type: 'string',
          pattern: '/^\\/(.*)\\/([a-z]*)$/',
        }
      }

      if (customZodType === 'URL') {
        return {
          type: 'string',
          format: 'uri',
        }
      }

      const typeName = schema._def.typeName as ZodFirstPartyTypeKind | undefined

      if (typeName === ZodFirstPartyTypeKind.ZodBigInt) {
        return {
          type: 'string',
          pattern: '^[0-9]+$',
        }
      }

      if (typeName === ZodFirstPartyTypeKind.ZodNaN) {
        return {
          type: 'string',
          const: 'NaN',
        }
      }

      return ignoreOverride
    },
  })

  return jsonSchema
}
