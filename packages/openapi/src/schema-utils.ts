import { isPlainObject } from '@orpc/shared'
import { type FileSchema, type JSONSchema, NON_LOGIC_KEYWORDS, type ObjectSchema } from './schema'

export class SchemaUtils {
  isFileSchema(schema: JSONSchema.JSONSchema): schema is FileSchema {
    return typeof schema === 'object' && schema.type === 'string' && typeof schema.contentMediaType === 'string'
  }

  isObjectSchema(schema: JSONSchema.JSONSchema): schema is ObjectSchema {
    return typeof schema === 'object' && schema.type === 'object'
  }

  isAnySchema(schema: JSONSchema.JSONSchema): boolean {
    return schema === true || Object.keys(schema).length === 0
  }

  isUndefinableSchema(schema: JSONSchema.JSONSchema): boolean {
    if (typeof schema === 'boolean') {
      return schema
    }

    return Object.keys(schema).length === 0
  }

  separateObjectSchema(schema: ObjectSchema, separatedProperties: string[]): [matched: ObjectSchema, rest: ObjectSchema] {
    const matched = { ...schema }
    const rest = { ...schema }

    matched.properties = Object.entries(schema.properties ?? {})
      .filter(([key]) => separatedProperties.includes(key))
      .reduce((acc, [key, value]) => {
        acc[key] = value
        return acc
      }, {} as Record<string, JSONSchema.JSONSchema>)

    matched.required = schema.required?.filter(key => separatedProperties.includes(key))

    matched.examples = schema.examples?.map((example) => {
      if (!isPlainObject(example)) {
        return example
      }

      return Object.entries(example).reduce((acc, [key, value]) => {
        if (separatedProperties.includes(key)) {
          acc[key] = value
        }

        return acc
      }, {} as Record<string, unknown>)
    })

    rest.properties = Object.entries(schema.properties ?? {})
      .filter(([key]) => !separatedProperties.includes(key))
      .reduce((acc, [key, value]) => {
        acc[key] = value
        return acc
      }, {} as Record<string, JSONSchema.JSONSchema>)

    rest.required = schema.required?.filter(key => !separatedProperties.includes(key))

    rest.examples = schema.examples?.map((example) => {
      if (!isPlainObject(example)) {
        return example
      }

      return Object.entries(example).reduce((acc, [key, value]) => {
        if (!separatedProperties.includes(key)) {
          acc[key] = value
        }

        return acc
      }, {} as Record<string, unknown>)
    })

    return [matched, rest]
  }

  splitSchemaPreservingLogic(
    schema: JSONSchema.JSONSchema,
    check: (schema: JSONSchema.JSONSchema) => boolean,
    matches: JSONSchema.JSONSchema[] = [],
  ): [JSONSchema.JSONSchema | undefined, JSONSchema.JSONSchema[]] {
    if (check(schema)) {
      matches.push(schema)
      return [undefined, matches]
    }

    if (typeof schema === 'boolean') {
      return [schema, matches]
    }

    // TODO: $ref

    if (
      schema.anyOf
      && Object.keys(schema).every(
        k => k === 'anyOf' || NON_LOGIC_KEYWORDS.includes(k as any),
      )
    ) {
      const anyOf = schema.anyOf
        .map(s => this.splitSchemaPreservingLogic(s, check, matches)[0])
        .filter(v => !!v)

      if (anyOf.length === 1 && typeof anyOf[0] === 'object') {
        return [{ ...schema, anyOf: undefined, ...anyOf[0] }, matches]
      }

      return [{ ...schema, anyOf }, matches]
    }

    // TODO: $ref

    if (
      schema.oneOf
      && Object.keys(schema).every(
        k => k === 'oneOf' || NON_LOGIC_KEYWORDS.includes(k as any),
      )
    ) {
      const oneOf = schema.oneOf
        .map(s => this.splitSchemaPreservingLogic(s, check, matches)[0])
        .filter(v => !!v)

      if (oneOf.length === 1 && typeof oneOf[0] === 'object') {
        return [{ ...schema, oneOf: undefined, ...oneOf[0] }, matches]
      }

      return [{ ...schema, oneOf }, matches]
    }

    return [schema, matches]
  }
}

export type PublicSchemaUtils = Pick<SchemaUtils, keyof SchemaUtils>
