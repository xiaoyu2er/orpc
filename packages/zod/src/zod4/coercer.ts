import type { Context } from '@orpc/server'
import type { StandardHandlerOptions, StandardHandlerPlugin } from '@orpc/server/standard'
import type { $ZodArray, $ZodCatch, $ZodDefault, $ZodEnum, $ZodIntersection, $ZodLazy, $ZodLiteral, $ZodMap, $ZodNonOptional, $ZodNullable, $ZodObject, $ZodOptional, $ZodPipe, $ZodReadonly, $ZodRecord, $ZodSet, $ZodTuple, $ZodType, $ZodUnion, util } from '@zod/core'
import { guard, isObject } from '@orpc/shared'

export class ZodSmartCoercionPlugin<TContext extends Context> implements StandardHandlerPlugin<TContext> {
  init(options: StandardHandlerOptions<TContext>): void {
    options.clientInterceptors ??= []

    options.clientInterceptors.unshift((options) => {
      const inputSchema = options.procedure['~orpc'].inputSchema

      if (!inputSchema || inputSchema['~standard'].vendor !== 'zod') {
        return options.next()
      }

      const coercedInput = this.#coerce(inputSchema as $ZodType, options.input)

      return options.next({ ...options, input: coercedInput })
    })
  }

  #coerce(schema: $ZodType, value: unknown): unknown {
    switch (schema._zod.def.type) {
      case 'number' : {
        if (typeof value === 'string') {
          return this.#stringToNumber(value)
        }

        return value
      }

      case 'bigint' : {
        if (typeof value === 'string') {
          return this.#stringToBigInt(value)
        }

        return value
      }

      case 'boolean' :
      case 'success' : {
        if (typeof value === 'string') {
          return this.#stringToBoolean(value)
        }

        return value
      }

      case 'date' : {
        if (typeof value === 'string') {
          return this.#stringToDate(value)
        }

        return value
      }

      case 'literal' :
      case 'enum': {
        const literal = schema as $ZodLiteral | $ZodEnum

        if (!literal._zod.values.has(value as any) && typeof value === 'string') {
          const num = this.#stringToNumber(value)
          if (literal._zod.values.has(num as any)) {
            return num
          }

          const bool = this.#stringToBoolean(value)
          if (literal._zod.values.has(bool as any)) {
            return bool
          }

          const bigint = this.#stringToBigInt(value)
          if (literal._zod.values.has(bigint as any)) {
            return bigint
          }
        }

        return value
      }

      case 'array': {
        const array = schema as $ZodArray

        if (value === undefined) {
          return []
        }

        if (Array.isArray(value)) {
          return value.map(v => this.#coerce(array._zod.def.element, v))
        }

        return value
      }

      case 'tuple': {
        const tuple = schema as $ZodTuple

        if (value === undefined) {
          return []
        }

        if (Array.isArray(value)) {
          return value.map((v, i) => {
            const s = tuple._zod.def.items[i] ?? tuple._zod.def.rest
            return s ? this.#coerce(s, v) : v
          })
        }

        return value
      }

      case 'set': {
        const set = schema as $ZodSet

        if (value === undefined) {
          return new Set()
        }

        if (Array.isArray(value)) {
          return new Set(
            value.map(v => this.#coerce(set._zod.def.valueType, v)),
          )
        }

        if (value instanceof Set) {
          return new Set(
            Array.from(value).map(v => this.#coerce(set._zod.def.valueType, v)),
          )
        }

        return value
      }

      case 'object':
      case 'interface': {
        const object = schema as $ZodObject

        if (value === undefined) {
          return {}
        }

        if (isObject(value)) {
          const newObj: Record<string, unknown> = {}

          const keys = new Set([
            ...Object.keys(value),
            ...Object.keys(object._zod.def.shape),
          ])

          for (const k of keys) {
            const s = object._zod.def.shape[k] ?? object._zod.def.catchall
            newObj[k] = s ? this.#coerce(s, value[k]) : value[k]
          }

          return newObj
        }

        return value
      }

      case 'record': {
        const record = schema as $ZodRecord

        if (value === undefined) {
          return {}
        }

        if (isObject(value)) {
          const newObj: Record<string, unknown> = {}

          for (const [k, v] of Object.entries(value)) {
            const key = this.#coerce(record._zod.def.keyType, k)
            const val = this.#coerce(record._zod.def.valueType, v)
            newObj[key as any] = val
          }

          return newObj
        }

        return value
      }

      case 'map': {
        const map = schema as $ZodMap

        if (value === undefined) {
          return new Map()
        }

        if (Array.isArray(value) && value.every(i => Array.isArray(i) && i.length <= 2)) {
          return new Map(
            value.map(([k, v]) => [
              this.#coerce(map._zod.def.keyType, k),
              this.#coerce(map._zod.def.valueType, v),
            ]),
          )
        }

        if (value instanceof Map) {
          return new Map(
            Array.from(value).map(([k, v]) => [
              this.#coerce(map._zod.def.keyType, k),
              this.#coerce(map._zod.def.valueType, v),
            ]),
          )
        }

        return value
      }

      case 'union': {
        const union = schema as $ZodUnion

        if (union._zod.def.options.length === 1) {
          return this.#coerce(union._zod.def.options[0]!, value)
        }

        // support discriminated unions
        if (isObject(value)) {
          for (const option of union._zod.def.options) {
            if (option._zod.disc && this.#matchDiscriminators(value, option._zod.disc)) {
              return this.#coerce(option, value)
            }
          }
        }

        return value
      }

      case 'intersection': {
        const intersection = schema as $ZodIntersection

        return this.#coerce(
          intersection._zod.def.right,
          this.#coerce(intersection._zod.def.left, value),
        )
      }

      case 'optional': {
        const optional = schema as $ZodOptional

        if (value === undefined) {
          return undefined
        }

        return this.#coerce(optional._zod.def.innerType, value)
      }

      case 'nonoptional': {
        const nonoptional = schema as $ZodNonOptional
        return this.#coerce(nonoptional._zod.def.innerType, value)
      }

      case 'nullable': {
        const nullable = schema as $ZodNullable

        if (value === null) {
          return null
        }

        return this.#coerce(nullable._zod.def.innerType, value)
      }

      case 'readonly': {
        const readonly_ = schema as $ZodReadonly
        return this.#coerce(readonly_._zod.def.innerType, value)
      }

      case 'pipe': {
        const pipe = schema as $ZodPipe
        return this.#coerce(pipe._zod.def.in, value)
      }

      case 'default':
      case 'catch': {
        const default_ = schema as $ZodDefault | $ZodCatch
        return this.#coerce(default_._zod.def.innerType, value)
      }

      case 'lazy': {
        const lazy = schema as $ZodLazy

        // Prevent infinite loop
        if (value !== undefined) {
          return this.#coerce(lazy._zod.def.getter(), value)
        }

        return value
      }

      default: {
        const _unsupported:
          | 'null'
          | 'nan'
          | 'transform'
          | 'void'
          | 'never'
          | 'any'
          | 'unknown'
          | 'file'
          | 'undefined'
          | 'string'
          | 'template_literal'
          | 'int'
          | 'symbol'
          | 'promise'
          | 'custom'
          = schema._zod.def.type

        return value
      }
    }
  }

  #stringToNumber(value: string): number | string {
    const num = Number(value)
    return Number.isNaN(num) || num.toString() !== value ? value : num
  }

  #stringToBigInt(value: string): bigint | string {
    return guard(() => BigInt(value)) ?? value
  }

  #stringToBoolean(value: string): boolean | string {
    const lower = value.toLowerCase()

    if (lower === 'false' || lower === 'off' || lower === 'f') {
      return false
    }

    if (lower === 'true' || lower === 'on' || lower === 't') {
      return true
    }

    return value
  }

  #stringToDate(value: string): Date | string {
    const date = new Date(value)

    if (!Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)) {
      return date
    }

    return value
  }

  /**
   * This function is inspired from Zod, because it's not exported
   * https://github.com/colinhacks/zod/blob/v4/packages/core/src/schemas.ts#L1903C1-L1921C2
   */
  #matchDiscriminators(input: Record<PropertyKey, unknown>, discs: util.DiscriminatorMap): boolean {
    for (const [key, value] of discs) {
      const data = input[key]

      if (value.values.size && !value.values.has(data as any)) {
        return false
      }

      if (value.maps.length === 0) {
        continue
      }

      if (!isObject(data)) {
        return false
      }

      for (const m of value.maps) {
        if (!this.#matchDiscriminators(data, m)) {
          return false
        }
      }
    }

    return true
  }
}
