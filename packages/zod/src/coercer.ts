import type { Context } from '@orpc/server'
import type { Plugin } from '@orpc/server/plugins'
import type { WellCreateProcedureClientOptions } from '@orpc/server/standard'
import { guard } from '@orpc/shared'
import { getCustomZodType } from '@orpc/zod'
import { isPlainObject } from 'is-what'
import {
  type EnumLike,
  type ZodArray,
  type ZodBranded,
  type ZodCatch,
  type ZodDefault,
  type ZodDiscriminatedUnion,
  type ZodEffects,
  ZodFirstPartyTypeKind,
  type ZodIntersection,
  type ZodLazy,
  type ZodLiteral,
  type ZodMap,
  type ZodNativeEnum,
  type ZodNullable,
  type ZodObject,
  type ZodOptional,
  type ZodPipeline,
  type ZodReadonly,
  type ZodRecord,
  type ZodSet,
  type ZodTypeAny,
  type ZodUnion,
} from 'zod'

export class ZodAutoCoercePlugin<TContext extends Context> implements Plugin<TContext> {
  beforeCreateProcedureClient(clientOptions: WellCreateProcedureClientOptions<TContext>): void {
    clientOptions.interceptors ??= []

    clientOptions.interceptors.unshift((options) => {
      const inputSchema = options.procedure['~orpc'].inputSchema

      if (!inputSchema || inputSchema['~standard'].vendor !== 'zod') {
        return options.next()
      }

      const coercedInput = zodCoerceInternal(inputSchema as ZodTypeAny, options.input, { bracketNotation: true })

      return options.next({ ...options, input: coercedInput })
    })
  }
}

function zodCoerceInternal(
  schema: ZodTypeAny,
  value: unknown,
  options?: { isRoot?: boolean, bracketNotation?: boolean },
): unknown {
  const isRoot = options?.isRoot ?? true
  const options_ = { ...options, isRoot: false }

  if (
    isRoot
    && options?.bracketNotation
    && Array.isArray(value)
    && value.length === 1
  ) {
    const newValue = zodCoerceInternal(schema, value[0], options_)
    if (schema.safeParse(newValue).success) {
      return newValue
    }
    return zodCoerceInternal(schema, value, options_)
  }

  const customType = getCustomZodType(schema._def)

  if (customType === 'Invalid Date') {
    if (
      typeof value === 'string'
      && value.toLocaleLowerCase() === 'invalid date'
    ) {
      return new Date('Invalid Date')
    }
  }
  else if (customType === 'RegExp') {
    if (typeof value === 'string' && value.startsWith('/')) {
      const match = value.match(/^\/(.*)\/([a-z]*)$/)

      if (match) {
        const [, pattern, flags] = match
        return new RegExp(pattern!, flags)
      }
    }
  }
  else if (customType === 'URL') {
    if (typeof value === 'string') {
      const url = guard(() => new URL(value))
      if (url !== undefined) {
        return url
      }
    }
  }

  if (schema._def.typeName === undefined) {
    return value
  }

  const typeName = schema._def.typeName as ZodFirstPartyTypeKind

  if (typeName === ZodFirstPartyTypeKind.ZodNumber) {
    if (options_?.bracketNotation && typeof value === 'string') {
      const num = Number(value)
      if (!Number.isNaN(num)) {
        return num
      }
    }
  }

  //
  else if (typeName === ZodFirstPartyTypeKind.ZodNaN) {
    if (typeof value === 'string' && value.toLocaleLowerCase() === 'nan') {
      return Number.NaN
    }
  }

  //
  else if (typeName === ZodFirstPartyTypeKind.ZodBoolean) {
    if (options_?.bracketNotation && typeof value === 'string') {
      const lower = value.toLowerCase()

      if (lower === 'false' || lower === 'off' || lower === 'f') {
        return false
      }

      if (lower === 'true' || lower === 'on' || lower === 't') {
        return true
      }
    }
  }

  //
  else if (typeName === ZodFirstPartyTypeKind.ZodNull) {
    if (
      options_?.bracketNotation
      && typeof value === 'string'
      && value.toLowerCase() === 'null'
    ) {
      return null
    }
  }

  //
  else if (
    typeName === ZodFirstPartyTypeKind.ZodUndefined
    || typeName === ZodFirstPartyTypeKind.ZodVoid
  ) {
    if (typeof value === 'string' && value.toLowerCase() === 'undefined') {
      return undefined
    }
  }

  //
  else if (typeName === ZodFirstPartyTypeKind.ZodDate) {
    if (
      typeof value === 'string'
      && (value.includes('-')
        || value.includes(':')
        || value.toLocaleLowerCase() === 'invalid date')
    ) {
      return new Date(value)
    }
  }

  //
  else if (typeName === ZodFirstPartyTypeKind.ZodBigInt) {
    if (typeof value === 'string') {
      const num = guard(() => BigInt(value))
      if (num !== undefined) {
        return num
      }
    }
  }

  //
  else if (
    typeName === ZodFirstPartyTypeKind.ZodArray
    || typeName === ZodFirstPartyTypeKind.ZodTuple
  ) {
    const schema_ = schema as ZodArray<ZodTypeAny>

    if (Array.isArray(value)) {
      return value.map(v => zodCoerceInternal(schema_._def.type, v, options_))
    }

    if (options_?.bracketNotation) {
      if (value === undefined) {
        return []
      }

      if (
        isPlainObject(value)
        && Object.keys(value).every(k => /^[1-9]\d*$/.test(k) || k === '0')
      ) {
        const indexes = Object.keys(value)
          .map(k => Number(k))
          .sort((a, b) => a - b)

        const arr = Array.from({ length: (indexes.at(-1) ?? -1) + 1 })

        for (const i of indexes) {
          arr[i] = zodCoerceInternal(schema_._def.type, value[i], options_)
        }

        return arr
      }
    }
  }

  //
  else if (typeName === ZodFirstPartyTypeKind.ZodObject) {
    const schema_ = schema as ZodObject<{ [k: string]: ZodTypeAny }>

    if (isPlainObject(value)) {
      const newObj: Record<string, unknown> = {}

      const keys = new Set([
        ...Object.keys(value),
        ...Object.keys(schema_.shape),
      ])

      for (const k of keys) {
        if (!(k in value))
          continue

        const v = value[k]
        newObj[k] = zodCoerceInternal(
          schema_.shape[k] ?? schema_._def.catchall,
          v,
          options_,
        )
      }

      return newObj
    }

    if (options_?.bracketNotation) {
      if (value === undefined) {
        return {}
      }

      if (Array.isArray(value) && value.length === 1) {
        const emptySchema = schema_.shape[''] ?? schema_._def.catchall
        return { '': zodCoerceInternal(emptySchema, value[0], options_) }
      }
    }
  }

  //
  else if (typeName === ZodFirstPartyTypeKind.ZodSet) {
    const schema_ = schema as ZodSet

    if (Array.isArray(value)) {
      return new Set(
        value.map(v => zodCoerceInternal(schema_._def.valueType, v, options_)),
      )
    }

    if (options_?.bracketNotation) {
      if (value === undefined) {
        return new Set()
      }

      if (
        isPlainObject(value)
        && Object.keys(value).every(k => /^[1-9]\d*$/.test(k) || k === '0')
      ) {
        const indexes = Object.keys(value)
          .map(k => Number(k))
          .sort((a, b) => a - b)

        const arr = Array.from({ length: (indexes.at(-1) ?? -1) + 1 })

        for (const i of indexes) {
          arr[i] = zodCoerceInternal(schema_._def.valueType, value[i], options_)
        }

        return new Set(arr)
      }
    }
  }

  //
  else if (typeName === ZodFirstPartyTypeKind.ZodMap) {
    const schema_ = schema as ZodMap

    if (
      Array.isArray(value)
      && value.every(i => Array.isArray(i) && i.length === 2)
    ) {
      return new Map(
        value.map(([k, v]) => [
          zodCoerceInternal(schema_._def.keyType, k, options_),
          zodCoerceInternal(schema_._def.valueType, v, options_),
        ]),
      )
    }

    if (options_?.bracketNotation) {
      if (value === undefined) {
        return new Map()
      }

      if (isPlainObject(value)) {
        const arr = Array.from({ length: Object.keys(value).length })
          .fill(undefined)
          .map((_, i) =>
            isPlainObject(value[i])
            && Object.keys(value[i]).length === 2
            && '0' in value[i]
            && '1' in value[i]
              ? ([value[i]['0'], value[i]['1']] as const)
              : undefined,
          )

        if (arr.every(v => !!v)) {
          return new Map(
            arr.map(([k, v]) => [
              zodCoerceInternal(schema_._def.keyType, k, options_),
              zodCoerceInternal(schema_._def.valueType, v, options_),
            ]),
          )
        }
      }
    }
  }

  //
  else if (typeName === ZodFirstPartyTypeKind.ZodRecord) {
    const schema_ = schema as ZodRecord

    if (isPlainObject(value)) {
      const newObj: any = {}

      for (const [k, v] of Object.entries(value)) {
        const key = zodCoerceInternal(schema_._def.keyType, k, options_) as any
        const val = zodCoerceInternal(schema_._def.valueType, v, options_)
        newObj[key] = val
      }

      return newObj
    }
  }

  //
  else if (
    typeName === ZodFirstPartyTypeKind.ZodUnion
    || typeName === ZodFirstPartyTypeKind.ZodDiscriminatedUnion
  ) {
    const schema_ = schema as
      | ZodUnion<[ZodTypeAny]>
      | ZodDiscriminatedUnion<any, [ZodObject<any>]>

    if (schema_.safeParse(value).success) {
      return value
    }

    const results: [unknown, number][] = []
    for (const s of schema_._def.options) {
      const newValue = zodCoerceInternal(s, value, { ...options_, isRoot })

      if (newValue === value)
        continue

      const result = schema_.safeParse(newValue)

      if (result.success) {
        return newValue
      }

      results.push([newValue, result.error.issues.length])
    }

    if (results.length === 0) {
      return value
    }

    return results.sort((a, b) => a[1] - b[1])[0]?.[0]
  }

  //
  else if (typeName === ZodFirstPartyTypeKind.ZodIntersection) {
    const schema_ = schema as ZodIntersection<ZodTypeAny, ZodTypeAny>

    return zodCoerceInternal(
      schema_._def.right,
      zodCoerceInternal(schema_._def.left, value, { ...options_, isRoot }),
      { ...options_, isRoot },
    )
  }

  //
  else if (typeName === ZodFirstPartyTypeKind.ZodReadonly) {
    const schema_ = schema as ZodReadonly<ZodTypeAny>

    return zodCoerceInternal(schema_._def.innerType, value, { ...options_, isRoot })
  }

  //
  else if (typeName === ZodFirstPartyTypeKind.ZodPipeline) {
    const schema_ = schema as ZodPipeline<ZodTypeAny, ZodTypeAny>

    return zodCoerceInternal(schema_._def.in, value, { ...options_, isRoot })
  }

  //
  else if (typeName === ZodFirstPartyTypeKind.ZodLazy) {
    const schema_ = schema as ZodLazy<ZodTypeAny>

    return zodCoerceInternal(schema_._def.getter(), value, { ...options_, isRoot })
  }

  //
  else if (typeName === ZodFirstPartyTypeKind.ZodEffects) {
    const schema_ = schema as ZodEffects<ZodTypeAny>

    return zodCoerceInternal(schema_._def.schema, value, { ...options_, isRoot })
  }

  //
  else if (typeName === ZodFirstPartyTypeKind.ZodBranded) {
    const schema_ = schema as ZodBranded<ZodTypeAny, any>

    return zodCoerceInternal(schema_._def.type, value, { ...options_, isRoot })
  }

  //
  else if (typeName === ZodFirstPartyTypeKind.ZodCatch) {
    const schema_ = schema as ZodCatch<ZodTypeAny>

    return zodCoerceInternal(schema_._def.innerType, value, { ...options_, isRoot })
  }

  //
  else if (typeName === ZodFirstPartyTypeKind.ZodDefault) {
    const schema_ = schema as ZodDefault<ZodTypeAny>

    return zodCoerceInternal(schema_._def.innerType, value, { ...options_, isRoot })
  }

  //
  else if (typeName === ZodFirstPartyTypeKind.ZodNullable) {
    const schema_ = schema as ZodNullable<ZodTypeAny>

    if (value === null) {
      return null
    }

    if (typeof value === 'string' && value.toLowerCase() === 'null') {
      return schema_.safeParse(value).success ? value : null
    }

    return zodCoerceInternal(schema_._def.innerType, value, { ...options_, isRoot })
  }

  //
  else if (typeName === ZodFirstPartyTypeKind.ZodOptional) {
    const schema_ = schema as ZodOptional<ZodTypeAny>

    if (value === undefined) {
      return undefined
    }

    if (typeof value === 'string' && value.toLowerCase() === 'undefined') {
      return schema_.safeParse(value).success ? value : undefined
    }

    return zodCoerceInternal(schema_._def.innerType, value, { ...options_, isRoot })
  }

  //
  else if (typeName === ZodFirstPartyTypeKind.ZodNativeEnum) {
    const schema_ = schema as ZodNativeEnum<EnumLike>

    if (Object.values(schema_._def.values).includes(value as any)) {
      return value
    }

    if (options?.bracketNotation && typeof value === 'string') {
      for (const expectedValue of Object.values(schema_._def.values)) {
        if (expectedValue.toString() === value) {
          return expectedValue
        }
      }
    }
  }

  //
  else if (typeName === ZodFirstPartyTypeKind.ZodLiteral) {
    const schema_ = schema as ZodLiteral<unknown>
    const expectedValue = schema_._def.value

    if (typeof value === 'string' && typeof expectedValue !== 'string') {
      if (typeof expectedValue === 'bigint') {
        const num = guard(() => BigInt(value))
        if (num !== undefined) {
          return num
        }
      }
      else if (expectedValue === undefined) {
        if (value.toLocaleLowerCase() === 'undefined') {
          return undefined
        }
      }
      else if (options?.bracketNotation) {
        if (typeof expectedValue === 'number') {
          const num = Number(value)
          if (!Number.isNaN(num)) {
            return num
          }
        }
        else if (typeof expectedValue === 'boolean') {
          const lower = value.toLowerCase()

          if (lower === 'false' || lower === 'off' || lower === 'f') {
            return false
          }

          if (lower === 'true' || lower === 'on' || lower === 't') {
            return true
          }
        }
        else if (expectedValue === null) {
          if (value.toLocaleLowerCase() === 'null') {
            return null
          }
        }
      }
    }
  }

  //
  else {
    const _expected:
      | ZodFirstPartyTypeKind.ZodString
      | ZodFirstPartyTypeKind.ZodEnum
      | ZodFirstPartyTypeKind.ZodSymbol
      | ZodFirstPartyTypeKind.ZodPromise
      | ZodFirstPartyTypeKind.ZodFunction
      | ZodFirstPartyTypeKind.ZodAny
      | ZodFirstPartyTypeKind.ZodUnknown
      | ZodFirstPartyTypeKind.ZodNever = typeName
  }

  return value
}
