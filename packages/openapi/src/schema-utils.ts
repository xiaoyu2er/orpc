import type { FileSchema, JSONSchema, ObjectSchema } from './schema'
import { isObject } from '@orpc/shared'
import { LOGIC_KEYWORDS } from './schema'

/**
 *@internal
 */
export function isFileSchema(schema: JSONSchema): schema is FileSchema {
  return isObject(schema) && schema.type === 'string' && typeof schema.contentMediaType === 'string'
}

/**
 * @internal
 */
export function isObjectSchema(schema: JSONSchema): schema is ObjectSchema {
  return isObject(schema) && schema.type === 'object'
}

/**
 * @internal
 */
export function isAnySchema(schema: JSONSchema): boolean {
  if (schema === true) {
    return true
  }

  if (Object.keys(schema).every(k => !LOGIC_KEYWORDS.includes(k))) {
    return true
  }

  return false
}

/**
 * @internal
 */
export function separateObjectSchema(schema: ObjectSchema, separatedProperties: string[]): [matched: ObjectSchema, rest: ObjectSchema] {
  if (Object.keys(schema).some(k => k !== 'type' && k !== 'properties' && k !== 'required' && LOGIC_KEYWORDS.includes(k))) {
    return [{ type: 'object' }, schema]
  }

  const matched: ObjectSchema = { ...schema }
  const rest: ObjectSchema = { ...schema }

  matched.properties = schema.properties && Object.entries(schema.properties)
    .filter(([key]) => separatedProperties.includes(key))
    .reduce((acc, [key, value]) => {
      acc[key] = value
      return acc
    }, {} as Record<string, JSONSchema>)

  matched.required = schema.required?.filter(key => separatedProperties.includes(key))

  matched.examples = schema.examples?.map((example) => {
    if (!isObject(example)) {
      return example
    }

    return Object.entries(example).reduce((acc, [key, value]) => {
      if (separatedProperties.includes(key)) {
        acc[key] = value
      }

      return acc
    }, {} as Record<string, unknown>)
  })

  rest.properties = schema.properties && Object.entries(schema.properties)
    .filter(([key]) => !separatedProperties.includes(key))
    .reduce((acc, [key, value]) => {
      acc[key] = value
      return acc
    }, {} as Record<string, JSONSchema>)

  rest.required = schema.required?.filter(key => !separatedProperties.includes(key))

  rest.examples = schema.examples?.map((example) => {
    if (!isObject(example)) {
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

/**
 * @internal
 */
export function filterSchemaBranches(
  schema: JSONSchema,
  check: (schema: JSONSchema) => boolean,
  matches: JSONSchema[] = [],
): [matches: JSONSchema[], rest: JSONSchema | undefined] {
  if (check(schema)) {
    matches.push(schema)
    return [matches, undefined]
  }
  if (isObject(schema)) {
    for (const keyword of ['anyOf', 'oneOf'] as const) {
      if (schema[keyword] && Object.keys(schema).every(
        k => k === keyword || !LOGIC_KEYWORDS.includes(k),
      )) {
        const rest = schema[keyword]
          .map(s => filterSchemaBranches(s, check, matches)[1])
          .filter(v => !!v)

        if (rest.length === 1 && typeof rest[0] === 'object') {
          return [matches, { ...schema, [keyword]: undefined, ...rest[0] }]
        }

        return [matches, { ...schema, [keyword]: rest }]
      }
    }
  }

  return [matches, schema]
}

export function applySchemaOptionality(required: boolean, schema: JSONSchema): JSONSchema {
  if (required) {
    return schema
  }

  return {
    anyOf: [
      schema,
      { not: {} },
    ],
  }
}

/**
 * Takes a JSON schema and, if it's primarily a union type (anyOf, oneOf),
 * recursively expands it into an array of its constituent, non-union base schemas.
 * If the schema is not a simple union or is a base type, it's returned as a single-element array.
 */
export function expandUnionSchema(schema: JSONSchema): JSONSchema[] {
  if (typeof schema === 'object') {
    for (const keyword of ['anyOf', 'oneOf'] as const) {
      if (schema[keyword] && Object.keys(schema).every(
        k => k === keyword || !LOGIC_KEYWORDS.includes(k),
      )) {
        return schema[keyword].flatMap(s => expandUnionSchema(s))
      }
    }
  }

  return [schema]
}
