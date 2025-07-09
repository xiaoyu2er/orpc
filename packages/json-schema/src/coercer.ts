import type { JsonSchema } from './types'
import { guard, isObject, toArray } from '@orpc/shared'

export class experimental_JsonSchemaCoercer {
  coerce(schema: JsonSchema, value: unknown): unknown {
    const [, coerced] = this.#coerce(schema, value)
    return coerced
  }

  #coerce(schema: JsonSchema, value: unknown): [satisfied: boolean, coerced: unknown] {
    if (typeof schema === 'boolean') {
      return [schema, value]
    }

    if (Array.isArray(schema.type)) {
      return this.#coerce({
        anyOf: schema.type.map(type => ({ ...schema, type })),
      }, value)
    }

    let coerced = value
    let satisfied = true

    const enumValues = schema.enum ?? (schema.const !== undefined ? [schema.const] : undefined)

    if (enumValues !== undefined && !enumValues.includes(coerced)) {
      if (typeof coerced === 'string') {
        const numberValue = this.#stringToNumber(coerced)

        if (enumValues.includes(numberValue)) {
          coerced = numberValue
        }
        else {
          const booleanValue = this.#stringToBoolean(coerced)

          if (enumValues.includes(booleanValue)) {
            coerced = booleanValue
          }
          else {
            satisfied = false
          }
        }
      }
      else if (typeof coerced === 'undefined' && enumValues.includes(null)) {
        coerced = null
      }
      else {
        satisfied = false
      }
    }

    if (typeof schema.type === 'string') {
      switch (schema.type) {
        case 'number':
        case 'integer': {
          if (typeof value === 'string') {
            coerced = this.#stringToNumber(value)
          }

          if (typeof coerced !== 'number') {
            satisfied = false
          }

          break
        }
        case 'boolean': {
          if (typeof coerced === 'string') {
            coerced = this.#stringToBoolean(coerced)
          }

          if (typeof coerced !== 'boolean') {
            satisfied = false
          }

          break
        }
        case 'null': {
          if (typeof coerced === 'undefined') {
            coerced = null
          }

          if (coerced !== null) {
            satisfied = false
          }

          break
        }
        case 'array': {
          if (typeof coerced === 'undefined') {
            coerced = []
          }

          if (Array.isArray(coerced)) {
            const prefixItemSchemas: readonly JsonSchema[] = 'prefixItems' in schema
              ? toArray(schema.prefixItems)
              : Array.isArray(schema.items)
                ? schema.items
                : []

            const itemSchema: JsonSchema | undefined = Array.isArray(schema.items)
              ? schema.additionalItems
              : schema.items as JsonSchema | undefined

            let shouldUseCoercedItems = false

            const coercedItems = coerced.map((item, i) => {
              const subSchema = prefixItemSchemas[i] ?? itemSchema
              if (subSchema === undefined) {
                return item
              }

              const [subSatisfied, subCoerced] = this.#coerce(subSchema, item)

              if (!subSatisfied) {
                satisfied = subSatisfied
              }

              if (subCoerced !== item) {
                shouldUseCoercedItems = true
              }

              return subCoerced
            })

            if (shouldUseCoercedItems) {
              coerced = coercedItems
            }
          }
          else {
            satisfied = false
          }
          break
        }
        case 'object': {
          if (typeof coerced === 'undefined') {
            coerced = {}
          }

          if (Array.isArray(coerced)) {
            coerced = { ...coerced }
          }

          if (isObject(coerced)) {
            const keys = new Set([
              ...Object.keys(coerced),
              ...Object.keys(schema.properties ?? {}),
            ])

            let shouldUseCoercedItems = false
            const coercedItems: Record<string, unknown> = {}

            for (const key of keys) {
              const value = coerced[key]
              const subSchema = schema.properties?.[key] ?? schema.additionalProperties

              if (subSchema === undefined || (value === undefined && !schema.required?.includes(key))) {
                coercedItems[key] = value
              }
              else {
                const [subSatisfied, subCoerced] = this.#coerce(subSchema, value)
                coercedItems[key] = subCoerced

                if (!subSatisfied) {
                  satisfied = subSatisfied
                }

                if (subCoerced !== value) {
                  shouldUseCoercedItems = true
                }
              }
            }

            if (shouldUseCoercedItems) {
              coerced = coercedItems
            }
          }
          else {
            satisfied = false
          }

          break
        }
      }
    }

    if ('x-native-type' in schema && typeof schema['x-native-type'] === 'string') {
      switch (schema['x-native-type']) {
        case 'date': {
          if (typeof coerced === 'string') {
            coerced = this.#stringToDate(coerced)
          }

          if (!(coerced instanceof Date)) {
            satisfied = false
          }

          break
        }
        case 'bigint': {
          if (typeof coerced === 'string') {
            coerced = this.#stringToBigInt(coerced)
          }

          if (typeof coerced !== 'bigint') {
            satisfied = false
          }

          break
        }
        case 'regexp': {
          if (typeof coerced === 'string') {
            coerced = this.#stringToRegExp(coerced)
          }

          if (!(coerced instanceof RegExp)) {
            satisfied = false
          }

          break
        }
        case 'url': {
          if (typeof coerced === 'string') {
            coerced = this.#stringToURL(coerced)
          }

          if (!(coerced instanceof URL)) {
            satisfied = false
          }

          break
        }
        case 'set': {
          if (Array.isArray(coerced)) {
            coerced = this.#arrayToSet(coerced)
          }

          if (!(coerced instanceof Set)) {
            satisfied = false
          }

          break
        }
        case 'map': {
          if (Array.isArray(coerced)) {
            coerced = this.#arrayToMap(coerced)
          }

          if (!(coerced instanceof Map)) {
            satisfied = false
          }

          break
        }
      }
    }

    if (schema.allOf) {
      for (const subSchema of schema.allOf) {
        const [subSatisfied, subCoerced] = this.#coerce(subSchema, coerced)

        coerced = subCoerced

        if (!subSatisfied) {
          satisfied = false
        }
      }
    }

    for (const key of ['anyOf', 'oneOf'] as const) {
      if (schema[key]) {
        let bestOptions: { coerced: unknown, satisfied: boolean } | undefined

        for (const subSchema of schema[key]) {
          const [subSatisfied, subCoerced] = this.#coerce(subSchema, coerced)

          if (subSatisfied) {
            if (!bestOptions || subCoerced === coerced) {
              bestOptions = { coerced: subCoerced, satisfied: subSatisfied }
            }

            if (subCoerced === coerced) {
              break
            }
          }
        }

        coerced = bestOptions ? bestOptions.coerced : coerced
        satisfied = bestOptions ? bestOptions.satisfied : false
      }
    }

    return [satisfied, coerced]
  }

  #stringToNumber(value: string): number | string {
    return guard(() => Number(value)) ?? value
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

  #stringToBigInt(value: string): bigint | string {
    return guard(() => BigInt(value)) ?? value
  }

  #stringToDate(value: string): Date | string {
    return guard(() => new Date(value)) ?? value
  }

  #stringToRegExp(value: string): RegExp | string {
    const match = value.match(/^\/(.*)\/([a-z]*)$/)

    if (match) {
      const [, pattern, flags] = match
      return guard(() => new RegExp(pattern!, flags)) ?? value
    }

    return value
  }

  #stringToURL(value: string): URL | string {
    return guard(() => new URL(value)) ?? value
  }

  #arrayToSet(value: unknown[]): Set<unknown> | unknown[] {
    return guard(() => new Set(value)) ?? value
  }

  #arrayToMap(value: unknown[]): Map<unknown, unknown> | unknown[] {
    return guard(() => new Map(value as [unknown, unknown][])) ?? value
  }
}
