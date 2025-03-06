import type { Schema } from '@orpc/contract'
import type { JSONSchema } from 'json-schema-typed/draft-2020-12'
import type { EnumLike, KeySchema, ZodAny, ZodArray, ZodBranded, ZodCatch, ZodDefault, ZodDiscriminatedUnion, ZodEffects, ZodEnum, ZodIntersection, ZodLazy, ZodLiteral, ZodMap, ZodNativeEnum, ZodNullable, ZodNumber, ZodObject, ZodOptional, ZodPipeline, ZodRawShape, ZodReadonly, ZodRecord, ZodSet, ZodString, ZodTuple, ZodTypeAny, ZodTypeDef, ZodUnion, ZodUnionOptions } from 'zod'
import { JSONSchemaFormat } from '@orpc/openapi'
import escapeStringRegexp from 'escape-string-regexp'
import { ZodFirstPartyTypeKind } from 'zod'
import { getCustomJsonSchema } from './custom-json-schema'
import { getCustomZodDef } from './schemas/base'

export interface ZodToJsonSchemaOptions {
  /**
   * Max depth of lazy type, if it exceeds.
   *
   * Used `{}` when reach max depth
   *
   * @default 3
   */
  maxLazyDepth?: number

  /**
   * The schema to be used when the Zod schema is unsupported.
   *
   * @default { not: {} }
   */
  unsupportedJsonSchema?: Exclude<JSONSchema, boolean>

  /**
   * The schema to be used to represent the any | unknown type.
   *
   * @default { }
   */
  anyJsonSchema?: Exclude<JSONSchema, boolean>
}

export class ZodToJsonSchemaConverter {
  private readonly maxLazyDepth: Exclude<ZodToJsonSchemaOptions['maxLazyDepth'], undefined>
  private readonly unsupportedJsonSchema: Exclude<ZodToJsonSchemaOptions['unsupportedJsonSchema'], undefined>
  private readonly anyJsonSchema: Exclude<ZodToJsonSchemaOptions['anyJsonSchema'], undefined>

  constructor(options: ZodToJsonSchemaOptions = {}) {
    this.maxLazyDepth = options.maxLazyDepth ?? 3
    this.unsupportedJsonSchema = options.unsupportedJsonSchema ?? { not: {} }
    this.anyJsonSchema = options.anyJsonSchema ?? {}
  }

  condition(schema: Schema): boolean {
    return Boolean(schema && schema['~standard'].vendor === 'zod')
  }

  convert(
    schema: Schema,
    strategy: 'input' | 'output',
    lazyDepth = 0,
    isHandledCustomJSONSchema = false,
    isHandledZodDescription = false,
  ): [required: boolean, jsonSchema: Exclude<JSONSchema, boolean>] {
    const def = (schema as ZodTypeAny)._def

    if (!isHandledZodDescription && 'description' in def && typeof def.description === 'string') {
      const [required, json] = this.convert(
        schema,
        strategy,
        lazyDepth,
        isHandledCustomJSONSchema,
        true,
      )

      return [required, { ...json, description: def.description }]
    }

    if (!isHandledCustomJSONSchema) {
      const customJSONSchema = getCustomJsonSchema(def, strategy)

      if (customJSONSchema) {
        const [required, json] = this.convert(
          schema,
          strategy,
          lazyDepth,
          true,
          isHandledZodDescription,
        )

        return [required, { ...json, ...customJSONSchema }]
      }
    }

    const customSchema = this.handleCustomZodDef(def)

    if (customSchema) {
      return [true, customSchema]
    }

    const typeName = this.getZodTypeName(def)

    switch (typeName) {
      case ZodFirstPartyTypeKind.ZodString: {
        const schema_ = schema as ZodString

        const json: JSONSchema = { type: 'string' }

        for (const check of schema_._def.checks) {
          switch (check.kind) {
            case 'base64':
              json.contentEncoding = 'base64'
              break
            case 'cuid':
              json.pattern = '^[0-9A-HJKMNP-TV-Z]{26}$'
              break
            case 'email':
              json.format = JSONSchemaFormat.Email
              break
            case 'url':
              json.format = JSONSchemaFormat.URI
              break
            case 'uuid':
              json.format = JSONSchemaFormat.UUID
              break
            case 'regex':
              json.pattern = check.regex.source
              break
            case 'min':
              json.minLength = check.value
              break
            case 'max':
              json.maxLength = check.value
              break
            case 'length':
              json.minLength = check.value
              json.maxLength = check.value
              break
            case 'includes':
              json.pattern = escapeStringRegexp(check.value)
              break
            case 'startsWith':
              json.pattern = `^${escapeStringRegexp(check.value)}`
              break
            case 'endsWith':
              json.pattern = `${escapeStringRegexp(check.value)}$`
              break
            case 'emoji':
              json.pattern
                  = '^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$'
              break
            case 'nanoid':
              json.pattern = '^[a-zA-Z0-9_-]{21}$'
              break
            case 'cuid2':
              json.pattern = '^[0-9a-z]+$'
              break
            case 'ulid':
              json.pattern = '^[0-9A-HJKMNP-TV-Z]{26}$'
              break
            case 'datetime':
              json.format = JSONSchemaFormat.DateTime
              break
            case 'date':
              json.format = JSONSchemaFormat.Date
              break
            case 'time':
              json.format = JSONSchemaFormat.Time
              break
            case 'duration':
              json.format = JSONSchemaFormat.Duration
              break
            case 'ip': {
              if (check.version === 'v4') {
                json.format = JSONSchemaFormat.IPv4
              }
              else if (check.version === 'v6') {
                json.format = JSONSchemaFormat.IPv6
              }
              else {
                json.anyOf = [
                  { format: JSONSchemaFormat.IPv4 },
                  { format: JSONSchemaFormat.IPv6 },
                ]
              }

              break
            }
            case 'jwt':
              json.pattern = '^[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]*$'
              break
            case 'base64url':
              json.pattern = '^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$'
              break
            default: {
              const _expect: 'toLowerCase' | 'toUpperCase' | 'trim' | 'cidr' = check.kind
            }
          }
        }

        return [true, json]
      }

      case ZodFirstPartyTypeKind.ZodNumber: {
        const schema_ = schema as ZodNumber

        const json: JSONSchema = { type: 'number' }

        for (const check of schema_._def.checks) {
          switch (check.kind) {
            case 'int':
              json.type = 'integer'
              break
            case 'min':
              json.minimum = check.value
              break
            case 'max':
              json.maximum = check.value
              break
            case 'multipleOf':
              json.multipleOf = check.value
              break
            default: {
              const _expect: 'finite' = check.kind
            }
          }
        }

        return [true, json]
      }

      case ZodFirstPartyTypeKind.ZodBigInt: {
        const json: JSONSchema = { type: 'string', pattern: '^-?[0-9]+$' }

        // WARN: ignore checks

        return [true, json]
      }

      case ZodFirstPartyTypeKind.ZodNaN: {
        return strategy === 'input'
          ? [true, this.unsupportedJsonSchema]
          : [true, { type: 'null' }]
      }

      case ZodFirstPartyTypeKind.ZodBoolean: {
        return [true, { type: 'boolean' }]
      }

      case ZodFirstPartyTypeKind.ZodDate: {
        const schema: JSONSchema = { type: 'string', format: JSONSchemaFormat.DateTime }

        // WARN: ignore checks

        return [true, schema]
      }

      case ZodFirstPartyTypeKind.ZodNull: {
        return [true, { type: 'null' }]
      }

      case ZodFirstPartyTypeKind.ZodLiteral: {
        const schema_ = schema as ZodLiteral<unknown>

        if (schema_._def.value === undefined) {
          return [false, this.unsupportedJsonSchema]
        }

        return [true, { const: schema_._def.value }]
      }

      case ZodFirstPartyTypeKind.ZodVoid:
      case ZodFirstPartyTypeKind.ZodUndefined: {
        return [false, this.unsupportedJsonSchema]
      }

      case ZodFirstPartyTypeKind.ZodUnknown:
      case ZodFirstPartyTypeKind.ZodAny: {
        return [false, this.anyJsonSchema]
      }

      case ZodFirstPartyTypeKind.ZodEnum: {
        const schema_ = schema as ZodEnum<[string, ...string[]]>

        return [true, { enum: schema_._def.values }]
      }

      case ZodFirstPartyTypeKind.ZodNativeEnum: {
        const schema_ = schema as ZodNativeEnum<EnumLike>

        return [true, { enum: Object.values(schema_._def.values) }]
      }

      case ZodFirstPartyTypeKind.ZodArray: {
        const schema_ = schema as ZodArray<ZodTypeAny>
        const def = schema_._def

        const json: JSONSchema = { type: 'array' }

        const [itemRequired, itemJson] = this.convert(def.type, strategy, lazyDepth, false, false)

        json.items = this.toArrayItemJsonSchema(itemRequired, itemJson, strategy)

        if (def.exactLength) {
          json.maxItems = def.exactLength.value
          json.minItems = def.exactLength.value
        }

        if (def.minLength) {
          json.minItems = def.minLength.value
        }

        if (def.maxLength) {
          json.maxItems = def.maxLength.value
        }

        return [true, json]
      }

      case ZodFirstPartyTypeKind.ZodTuple: {
        const schema_ = schema as ZodTuple<[ZodTypeAny, ...ZodTypeAny[]], ZodTypeAny | null>

        const prefixItems: JSONSchema[] = []
        const json: JSONSchema = { type: 'array' }

        for (const item of schema_._def.items) {
          const [itemRequired, itemJson] = this.convert(item, strategy, lazyDepth, false, false)

          prefixItems.push(
            this.toArrayItemJsonSchema(itemRequired, itemJson, strategy),
          )
        }

        if (prefixItems?.length) {
          json.prefixItems = prefixItems
        }

        if (schema_._def.rest) {
          const [itemRequired, itemJson] = this.convert(schema_._def.rest, strategy, lazyDepth, false, false)

          json.items = this.toArrayItemJsonSchema(itemRequired, itemJson, strategy)
        }

        return [true, json]
      }

      case ZodFirstPartyTypeKind.ZodObject: {
        const schema_ = schema as ZodObject<ZodRawShape>

        const json: JSONSchema = { type: 'object' }
        const properties: Record<string, JSONSchema> = {}
        const required: string[] = []

        for (const [key, value] of Object.entries(schema_.shape)) {
          const [itemRequired, itemJson] = this.convert(value, strategy, lazyDepth, false, false)

          properties[key] = itemJson

          if (itemRequired) {
            required.push(key)
          }
        }

        if (Object.keys(properties).length) {
          json.properties = properties
        }

        if (required.length) {
          json.required = required
        }

        const catchAllTypeName = this.getZodTypeName(schema_._def.catchall._def)

        if (catchAllTypeName === ZodFirstPartyTypeKind.ZodNever) {
          if (schema_._def.unknownKeys === 'strict') {
            json.additionalProperties = false
          }
        }
        else {
          const [_, addJson] = this.convert(schema_._def.catchall, strategy, lazyDepth, false, false)

          json.additionalProperties = addJson
        }

        return [true, json]
      }

      case ZodFirstPartyTypeKind.ZodRecord: {
        const schema_ = schema as ZodRecord<KeySchema, ZodAny>

        const json: JSONSchema = { type: 'object' }

        // WARN: ignore keyType

        const [_, itemJson] = this.convert(schema_._def.valueType, strategy, lazyDepth, false, false)

        json.additionalProperties = itemJson

        return [true, json]
      }

      case ZodFirstPartyTypeKind.ZodSet: {
        const schema_ = schema as ZodSet

        const json: JSONSchema = { type: 'array', uniqueItems: true }

        const [itemRequired, itemJson] = this.convert(schema_._def.valueType, strategy, lazyDepth, false, false)

        json.items = this.toArrayItemJsonSchema(itemRequired, itemJson, strategy)

        return [true, json]
      }

      case ZodFirstPartyTypeKind.ZodMap: {
        const schema_ = schema as ZodMap

        const [keyRequired, keyJson] = this.convert(schema_._def.keyType, strategy, lazyDepth, false, false)
        const [valueRequired, valueJson] = this.convert(schema_._def.valueType, strategy, lazyDepth, false, false)

        return [true, {
          type: 'array',
          items: {
            type: 'array',
            prefixItems: [
              this.toArrayItemJsonSchema(keyRequired, keyJson, strategy),
              this.toArrayItemJsonSchema(valueRequired, valueJson, strategy),
            ],
            maxItems: 2,
            minItems: 2,
          },
        }]
      }

      case ZodFirstPartyTypeKind.ZodUnion:
      case ZodFirstPartyTypeKind.ZodDiscriminatedUnion: {
        const schema_ = schema as
          | ZodUnion<ZodUnionOptions>
          | ZodDiscriminatedUnion<string, [ZodObject<any>, ...ZodObject<any>[]]>

        const anyOf: Exclude<JSONSchema, boolean>[] = []
        let required = true

        for (const item of schema_._def.options) {
          const [itemRequired, itemJson] = this.convert(item, strategy, lazyDepth, false, false)

          if (!itemRequired) {
            required = false

            if (itemJson !== this.unsupportedJsonSchema) {
              anyOf.push(itemJson)
            }
          }
          else {
            anyOf.push(itemJson)
          }
        }

        if (anyOf.length === 1) {
          return [required, anyOf[0]!]
        }

        return [required, { anyOf }]
      }

      case ZodFirstPartyTypeKind.ZodIntersection: {
        const schema_ = schema as ZodIntersection<ZodTypeAny, ZodTypeAny>

        const allOf: JSONSchema[] = []
        let required: boolean = false

        for (const item of [schema_._def.left, schema_._def.right]) {
          const [itemRequired, itemJson] = this.convert(item, strategy, lazyDepth, false, false)

          allOf.push(itemJson)

          if (itemRequired) {
            required = true
          }
        }

        return [required, { allOf }]
      }

      case ZodFirstPartyTypeKind.ZodLazy: {
        if (lazyDepth >= this.maxLazyDepth) {
          return [false, this.anyJsonSchema]
        }

        const schema_ = schema as ZodLazy<ZodTypeAny>

        return this.convert(schema_._def.getter(), strategy, lazyDepth + 1, false, false)
      }

      case ZodFirstPartyTypeKind.ZodOptional: {
        const schema_ = schema as ZodOptional<ZodTypeAny>

        const [_, inner] = this.convert(schema_._def.innerType, strategy, lazyDepth, false, false)

        return [false, inner]
      }

      case ZodFirstPartyTypeKind.ZodReadonly: {
        const schema_ = schema as ZodReadonly<ZodTypeAny>
        return this.convert(schema_._def.innerType, strategy, lazyDepth, false, false)
      }

      case ZodFirstPartyTypeKind.ZodDefault: {
        const schema_ = schema as ZodDefault<ZodTypeAny>

        const [_, json] = this.convert(schema_._def.innerType, strategy, lazyDepth, false, false)

        return [false, { default: schema_._def.defaultValue(), ...json }]
      }

      case ZodFirstPartyTypeKind.ZodEffects: {
        const schema_ = schema as ZodEffects<ZodTypeAny>

        if (schema_._def.effect.type === 'transform' && strategy === 'output') {
          return [false, this.anyJsonSchema]
        }

        return this.convert(schema_._def.schema, strategy, lazyDepth, false, false)
      }

      case ZodFirstPartyTypeKind.ZodCatch: {
        const schema_ = schema as ZodCatch<ZodTypeAny>
        return this.convert(schema_._def.innerType, strategy, lazyDepth, false, false)
      }

      case ZodFirstPartyTypeKind.ZodBranded: {
        const schema_ = schema as ZodBranded<ZodTypeAny, string | number | symbol>
        return this.convert(schema_._def.type, strategy, lazyDepth, false, false)
      }

      case ZodFirstPartyTypeKind.ZodPipeline: {
        const schema_ = schema as ZodPipeline<ZodTypeAny, ZodTypeAny>

        return this.convert(
          strategy === 'input' ? schema_._def.in : schema_._def.out,
          strategy,
          lazyDepth,
          false,
          false,
        )
      }

      case ZodFirstPartyTypeKind.ZodNullable: {
        const schema_ = schema as ZodNullable<ZodTypeAny>

        const [required, json] = this.convert(schema_._def.innerType, strategy, lazyDepth, false, false)

        return [required, { anyOf: [{ type: 'null' }, json] }]
      }
    }

    const _expected:
      | undefined
      | ZodFirstPartyTypeKind.ZodPromise
      | ZodFirstPartyTypeKind.ZodSymbol
      | ZodFirstPartyTypeKind.ZodFunction
      | ZodFirstPartyTypeKind.ZodNever = typeName

    return [true, this.unsupportedJsonSchema]
  }

  private handleCustomZodDef(def: ZodTypeDef): Exclude<JSONSchema, boolean> | undefined {
    const customZodDef = getCustomZodDef(def)

    if (!customZodDef) {
      return undefined
    }

    switch (customZodDef.type) {
      case 'blob': {
        return { type: 'string', contentMediaType: '*/*' }
      }

      case 'file': {
        return { type: 'string', contentMediaType: customZodDef.mimeType ?? '*/*' }
      }

      case 'regexp': {
        return {
          type: 'string',
          pattern: '^\\/(.*)\\/([a-z]*)$',
        }
      }

      case 'url': {
        return { type: 'string', format: JSONSchemaFormat.URI }
      }

      /* v8 ignore next 3 */
      default: {
        const _expect: never = customZodDef
      }
    }
  }

  private getZodTypeName(def: ZodTypeDef): ZodFirstPartyTypeKind | undefined {
    return (def as any).typeName as ZodFirstPartyTypeKind | undefined
  }

  private toArrayItemJsonSchema(required: boolean, schema: Exclude<JSONSchema, boolean>, strategy: 'input' | 'output'): Exclude<JSONSchema, boolean> {
    if (required) {
      return schema
    }

    return strategy === 'input'
      ? { anyOf: [schema, this.unsupportedJsonSchema] }
      : { anyOf: [schema, { type: 'null' }] }
  }
}
