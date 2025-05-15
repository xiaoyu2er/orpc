import type { AnySchema } from '@orpc/contract'
import type { ConditionalSchemaConverter, JSONSchema, SchemaConvertOptions } from '@orpc/openapi'
import type { Interceptor, Promisable, ThrowableError } from '@orpc/shared'
import type {
  $ZodArray,
  $ZodCatch,
  $ZodDefault,
  $ZodEnum,
  $ZodFile,
  $ZodIntersection,
  $ZodLazy,
  $ZodLiteral,
  $ZodMap,
  $ZodNonOptional,
  $ZodNullable,
  $ZodNumber,
  $ZodNumberFormats,
  $ZodObject,
  $ZodOptional,
  $ZodPipe,
  $ZodReadonly,
  $ZodRecord,
  $ZodSet,
  $ZodString,
  $ZodStringFormats,
  $ZodTemplateLiteral,
  $ZodTuple,
  $ZodType,
  $ZodUnion,
} from 'zod/v4/core'
import { JSONSchemaContentEncoding, JSONSchemaFormat } from '@orpc/openapi'
import { intercept } from '@orpc/shared'
import {
  globalRegistry,
} from 'zod/v4/core'
import {
  experimental_JSON_SCHEMA_INPUT_REGISTRY as JSON_SCHEMA_INPUT_REGISTRY,
  experimental_JSON_SCHEMA_OUTPUT_REGISTRY as JSON_SCHEMA_OUTPUT_REGISTRY,
  experimental_JSON_SCHEMA_REGISTRY as JSON_SCHEMA_REGISTRY,
} from './registries'

export interface experimental_ZodToJsonSchemaOptions {
  /**
   * Max depth of lazy type, if it exceeds.
   *
   * Used anyJsonSchema (`{}`) when reach max depth
   *
   * @default 2
   */
  maxLazyDepth?: number

  /**
   * The schema to be used to represent the any | unknown type.
   *
   * @default { }
   */
  anyJsonSchema?: Exclude<JSONSchema, boolean>

  /**
   * The schema to be used when the Zod schema is unsupported.
   *
   * @default { not: {} }
   */
  unsupportedJsonSchema?: Exclude<JSONSchema, boolean>

  /**
   * The schema to be used to represent the undefined type.
   *
   * @default { not: {} }
   */
  undefinedJsonSchema?: Exclude<JSONSchema, boolean>

  interceptors?: Interceptor<
    { schema: $ZodType, options: SchemaConvertOptions, lazyDepth: number, isHandledCustomJSONSchema: boolean },
    [required: boolean, jsonSchema: Exclude<JSONSchema, boolean>],
    ThrowableError
  >[]
}

export class experimental_ZodToJsonSchemaConverter implements ConditionalSchemaConverter {
  private readonly maxLazyDepth: Exclude<experimental_ZodToJsonSchemaOptions['maxLazyDepth'], undefined>
  private readonly anyJsonSchema: Exclude<experimental_ZodToJsonSchemaOptions['anyJsonSchema'], undefined>
  private readonly unsupportedJsonSchema: Exclude<experimental_ZodToJsonSchemaOptions['unsupportedJsonSchema'], undefined>
  private readonly undefinedJsonSchema: Exclude<experimental_ZodToJsonSchemaOptions['undefinedJsonSchema'], undefined>
  private readonly interceptors: Exclude<experimental_ZodToJsonSchemaOptions['interceptors'], undefined>

  constructor(options: experimental_ZodToJsonSchemaOptions = {}) {
    this.maxLazyDepth = options.maxLazyDepth ?? 2
    this.anyJsonSchema = options.anyJsonSchema ?? {}
    this.unsupportedJsonSchema = options.unsupportedJsonSchema ?? { not: {} }
    this.undefinedJsonSchema = options.undefinedJsonSchema ?? { not: {} }
    this.interceptors = options.interceptors ?? []
  }

  condition(schema: AnySchema | undefined): boolean {
    return schema !== undefined && schema['~standard'].vendor === 'zod'
  }

  convert(schema: AnySchema | undefined, options: SchemaConvertOptions): Promisable<[required: boolean, jsonSchema: Exclude<JSONSchema, boolean>]> {
    return this.#convert(schema as $ZodType, options, 0)
  }

  #convert(
    schema: $ZodType,
    options: SchemaConvertOptions,
    lazyDepth: number,
    isHandledCustomJSONSchema: boolean = false,
  ): Promise<[required: boolean, jsonSchema: Exclude<JSONSchema, boolean>]> {
    return intercept(
      this.interceptors,
      { schema, options, lazyDepth, isHandledCustomJSONSchema },
      async ({ schema, options, lazyDepth, isHandledCustomJSONSchema }) => {
        if (!isHandledCustomJSONSchema) {
          const customJSONSchema = this.#getCustomJsonSchema(schema, options)

          if (customJSONSchema) {
            const [required, json] = await this.#convert(schema, options, lazyDepth, true)

            return [required, { ...json, ...customJSONSchema }]
          }
        }

        switch (schema._zod.def.type) {
          case 'string': {
            const string = schema as $ZodString
            const json: JSONSchema = { type: 'string' }

            const { minimum, maximum, format, pattern, contentEncoding } = string._zod.computed as {
              minimum?: number
              maximum?: number
              format?: $ZodStringFormats
              pattern?: RegExp
              contentEncoding?: string
            }

            if (minimum !== undefined) {
              json.minLength = minimum
            }

            if (maximum !== undefined) {
              json.maxLength = maximum
            }

            if (contentEncoding !== undefined) {
              json.contentEncoding = this.#handleContentEncoding(contentEncoding)
            }

            /**
             * JSON Schema's "regex" format means the string _is_ a regex pattern.
             * Zod’s regex expects the string _to match_ a pattern.
             * These differ, so we ignore the "regex" format here.
             */
            if (format !== undefined && format !== 'regex' && json.contentEncoding === undefined) {
              json.format = this.#handleStringFormat(format)
            }

            if (pattern !== undefined && json.contentEncoding === undefined && json.format === undefined) {
              json.pattern = pattern.source
            }

            // Add a pattern for JWT if it's missing (acts as a polyfill for Zod v4)
            if (format === 'jwt' && json.contentEncoding === undefined && json.format === undefined && json.pattern === undefined) {
              json.pattern = /^[\w-]+\.[\w-]+\.[\w-]+$/.source
            }

            return [true, json]
          }

          case 'number': {
            const number = schema as $ZodNumber
            const json: JSONSchema = { type: 'number' }

            const { minimum, maximum, format, multipleOf, inclusive } = number._zod.computed as {
              minimum?: number
              maximum?: number
              format?: $ZodNumberFormats
              multipleOf?: number
              inclusive?: boolean
            }

            if (format?.includes('int')) {
              json.type = 'integer'
            }

            if (minimum !== undefined) {
              if (inclusive) {
                json.minimum = minimum
              }
              else {
                json.exclusiveMinimum = minimum
              }
            }

            if (maximum !== undefined) {
              if (inclusive) {
                json.maximum = maximum
              }
              else {
                json.exclusiveMaximum = maximum
              }
            }

            if (multipleOf !== undefined) {
              json.multipleOf = multipleOf
            }

            return [true, json]
          }

          case 'boolean': {
            return [true, { type: 'boolean' }]
          }

          case 'bigint': {
            return [true, { type: 'string', pattern: '^-?[0-9]+$' }]
          }

          case 'date': {
            return [true, { type: 'string', format: JSONSchemaFormat.DateTime }]
          }

          case 'null': {
            return [true, { type: 'null' }]
          }

          case 'undefined':
          case 'void': {
            return [false, this.undefinedJsonSchema]
          }

          case 'any': {
            return [false, this.anyJsonSchema]
          }

          case 'unknown': {
            return [false, this.anyJsonSchema]
          }

          case 'never': {
            return [true, this.unsupportedJsonSchema]
          }

          case 'array': {
            const array = schema as $ZodArray
            const json: JSONSchema = { type: 'array' }

            const { minimum, maximum } = array._zod.computed as {
              minimum?: number
              maximum?: number
            }

            if (minimum !== undefined) {
              json.minItems = minimum
            }

            if (maximum !== undefined) {
              json.maxItems = maximum
            }

            json.items = this.#handleArrayItemJsonSchema(await this.#convert(array._zod.def.element, options, lazyDepth), options)

            return [true, json]
          }

          case 'object': {
            const object = schema as $ZodObject
            const json: JSONSchema & { required?: string[] } = { type: 'object' }

            for (const [key, value] of Object.entries(object._zod.def.shape)) {
              const [itemRequired, itemJson] = await this.#convert(value, options, lazyDepth)

              json.properties ??= {}
              json.properties[key] = itemJson

              if (itemRequired) {
                json.required ??= []
                json.required.push(key)
              }
            }

            if (object._zod.def.catchall) {
              if (object._zod.def.catchall._zod.def.type === 'never') {
                json.additionalProperties = false
              }
              else {
                const [_, addJson] = await this.#convert(object._zod.def.catchall, options, lazyDepth)
                json.additionalProperties = addJson
              }
            }

            return [true, json]
          }

          case 'union': {
            const union = schema as $ZodUnion
            const anyOf: Exclude<JSONSchema, boolean>[] = []

            let required = true

            for (const item of union._zod.def.options) {
              const [itemRequired, itemJson] = await this.#convert(item, options, lazyDepth)

              if (!itemRequired) {
                required = false
              }

              if (options.strategy === 'input') {
                if (itemJson !== this.undefinedJsonSchema && itemJson !== this.unsupportedJsonSchema) {
                  anyOf.push(itemJson)
                }
              }
              else {
                if (itemJson !== this.undefinedJsonSchema) {
                  anyOf.push(itemJson)
                }
              }
            }

            return [required, anyOf.length === 1 ? anyOf[0]! : { anyOf }]
          }

          case 'intersection': {
            const intersection = schema as $ZodIntersection
            const json: JSONSchema & { allOf: Exclude<JSONSchema, boolean>[] } = { allOf: [] }

            let required = false

            for (const item of [intersection._zod.def.left, intersection._zod.def.right]) {
              const [itemRequired, itemJson] = await this.#convert(item, options, lazyDepth)

              json.allOf.push(itemJson)

              if (itemRequired) {
                required = true
              }
            }

            return [required, json]
          }

          case 'tuple': {
            const tuple = schema as $ZodTuple
            const json: JSONSchema & { prefixItems: JSONSchema[] } = { type: 'array', prefixItems: [] }

            for (const item of tuple._zod.def.items) {
              json.prefixItems.push(this.#handleArrayItemJsonSchema(await this.#convert(item, options, lazyDepth), options))
            }

            if (tuple._zod.def.rest) {
              json.items = this.#handleArrayItemJsonSchema(await this.#convert(tuple._zod.def.rest, options, lazyDepth), options)
            }

            const { minimum, maximum } = tuple._zod.computed as {
              minimum?: number
              maximum?: number
            }

            if (minimum !== undefined) {
              json.minItems = minimum
            }

            if (maximum !== undefined) {
              json.maxItems = maximum
            }

            return [true, json]
          }

          case 'record': {
            const record = schema as $ZodRecord
            const json: JSONSchema = { type: 'object' }

            json.propertyNames = (await this.#convert(record._zod.def.keyType, options, lazyDepth))[1]
            json.additionalProperties = (await this.#convert(record._zod.def.valueType, options, lazyDepth))[1]

            return [true, json]
          }

          case 'map': {
            const map = schema as $ZodMap

            return [true, {
              type: 'array',
              items: {
                type: 'array',
                prefixItems: [
                  this.#handleArrayItemJsonSchema(await this.#convert(map._zod.def.keyType, options, lazyDepth), options),
                  this.#handleArrayItemJsonSchema(await this.#convert(map._zod.def.valueType, options, lazyDepth), options),
                ],
                maxItems: 2,
                minItems: 2,
              },
            }]
          }

          case 'set': {
            const set = schema as $ZodSet
            return [true, {
              type: 'array',
              uniqueItems: true,
              items: this.#handleArrayItemJsonSchema(await this.#convert(set._zod.def.valueType, options, lazyDepth), options),
            }]
          }

          case 'enum': {
            const enum_ = schema as $ZodEnum
            return [true, { enum: Object.values(enum_._zod.def.entries) }]
          }

          case 'literal': {
            const literal = schema as $ZodLiteral

            let required = true
            const values = new Set<string | number | boolean | null>()

            for (const value of literal._zod.def.values) {
              if (value === undefined) {
                required = false
              }
              else {
                values.add(typeof value === 'bigint' ? value.toString() : value)
              }
            }

            const json: JSONSchema = values.size === 0
              ? this.undefinedJsonSchema
              : values.size === 1
                ? { const: values.values().next().value }
                : { enum: Array.from(values) }

            return [required, json]
          }

          case 'file': {
            const file = schema as $ZodFile
            const oneOf: Exclude<JSONSchema, boolean>[] = []

            const { mime } = file._zod.computed as {
              mime?: string[]
              minimum?: number // WARN: ignore
              maximum?: number // WARN: ignore
            }

            for (const type of mime ?? ['*/*']) {
              oneOf.push({
                type: 'string',
                contentMediaType: type,
              })
            }

            return [true, oneOf.length === 1 ? oneOf[0]! : { anyOf: oneOf }]
          }

          case 'transform': {
            return [false, this.anyJsonSchema]
          }

          case 'nullable': {
            const nullable = schema as $ZodNullable

            const [required, json] = await this.#convert(nullable._zod.def.innerType, options, lazyDepth)

            return [required, { anyOf: [json, { type: 'null' }] }]
          }

          case 'nonoptional': {
            const nonoptional = schema as $ZodNonOptional
            const [, json] = await this.#convert(nonoptional._zod.def.innerType, options, lazyDepth)
            return [true, json]
          }

          case 'success': {
            return [true, { type: 'boolean' }]
          }

          case 'default': {
            const default_ = schema as $ZodDefault
            const [, json] = await this.#convert(default_._zod.def.innerType, options, lazyDepth)

            return [false, {
              ...json,
              default: default_._zod.def.defaultValue(),
            }]
          }

          case 'catch': {
            const catch_ = schema as $ZodCatch
            const [,json] = await this.#convert(catch_._zod.def.innerType, options, lazyDepth)
            return [false, json]
          }

          case 'nan': {
            return [true, options.strategy === 'input' ? this.unsupportedJsonSchema : { type: 'null' }]
          }

          case 'pipe': {
            const pipe = schema as $ZodPipe
            return await this.#convert(options.strategy === 'input' ? pipe._zod.def.in : pipe._zod.def.out, options, lazyDepth)
          }

          case 'readonly': {
            const readonly_ = schema as $ZodReadonly
            const [required, json] = await this.#convert(readonly_._zod.def.innerType, options, lazyDepth)
            return [required, { ...json, readOnly: true }]
          }

          case 'template_literal': {
            const templateLiteral = schema as $ZodTemplateLiteral

            return [true, {
              type: 'string',
              pattern: templateLiteral._zod.pattern.source,
            }]
          }

          case 'optional': {
            const optional = schema as $ZodOptional
            const [, json] = await this.#convert(optional._zod.def.innerType, options, lazyDepth)
            return [false, json]
          }

          case 'lazy': {
            const lazy = schema as $ZodLazy

            if (lazyDepth >= this.maxLazyDepth) {
              return [false, this.anyJsonSchema]
            }

            return await this.#convert(lazy._zod.def.getter(), options, lazyDepth + 1)
          }

          default: {
            const _unsupported: 'interface' | 'int' | 'symbol' | 'promise' | 'custom' = schema._zod.def.type
            return [true, this.unsupportedJsonSchema]
          }
        }
      },
    )
  }

  #getCustomJsonSchema(schema: $ZodType, options: SchemaConvertOptions): Exclude<JSONSchema, boolean> | undefined {
    if (options.strategy === 'input' && JSON_SCHEMA_INPUT_REGISTRY.has(schema)) {
      return JSON_SCHEMA_INPUT_REGISTRY.get(schema) as Exclude<JSONSchema, boolean> | undefined
    }

    if (options.strategy === 'output' && JSON_SCHEMA_OUTPUT_REGISTRY.has(schema)) {
      return JSON_SCHEMA_OUTPUT_REGISTRY.get(schema) as Exclude<JSONSchema, boolean> | undefined
    }

    if (JSON_SCHEMA_REGISTRY.has(schema)) {
      return JSON_SCHEMA_REGISTRY.get(schema) as Exclude<JSONSchema, boolean> | undefined
    }

    const global = globalRegistry.get(schema)

    if (global) {
      return {
        description: global.description,
        examples: global.examples,
      }
    }
  }

  #handleArrayItemJsonSchema([required, schema]: [required: boolean, jsonSchema: Exclude<JSONSchema, boolean>], options: SchemaConvertOptions): Exclude<JSONSchema, boolean> {
    if (required || options.strategy === 'input') {
      return schema
    }

    if (schema === this.undefinedJsonSchema) {
      return { type: 'null' }
    }

    return {
      anyOf: [ // schema can contain { type: 'null' } so we should use anyOf instead of oneOf
        schema,
        { type: 'null' },
      ],
    }
  }

  #handleStringFormat(format: string): string | undefined {
    if (format === 'guid') {
      return JSONSchemaFormat.UUID
    }

    if (format === 'url') {
      return JSONSchemaFormat.URI
    }

    if (format === 'datetime') {
      return JSONSchemaFormat.DateTime
    }

    return Object.values(JSONSchemaFormat).includes(format as any)
      ? format
      : undefined
  }

  #handleContentEncoding(contentEncoding: string): Exclude<JSONSchema, boolean>['contentEncoding'] | undefined {
    return Object.values(JSONSchemaContentEncoding).includes(contentEncoding as any)
      ? contentEncoding as any
      : undefined
  }
}
