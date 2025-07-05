import type { JsonSchema } from './types'
import { isObject, toArray } from '@orpc/shared'

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
            const coercedItems: unknown[] = []
            let shouldUseCoercedItems = false

            const prefixItemSchemas: readonly JsonSchema[] = 'prefixItems' in schema
              ? toArray(schema.prefixItems)
              : Array.isArray(schema.items)
                ? schema.items
                : []

            const itemSchema: JsonSchema | undefined = Array.isArray(schema.items)
              ? schema.additionalItems
              : schema.items as JsonSchema | undefined

            const arrLength = Math.max(
              coerced.length,
              prefixItemSchemas.length,
            )

            for (let i = 0; i < arrLength; i++) {
              const value = coerced[i]
              const subSchema = prefixItemSchemas[i] ?? itemSchema

              if (subSchema === undefined) {
                coercedItems.push(value)
              }
              else {
                const [subSatisfied, subCoerced] = this.#coerce(subSchema, value)
                coercedItems.push(subCoerced)

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

    if (schema.not !== undefined) {
      const [notSatisfied] = this.#coerce(schema.not, coerced)

      if (notSatisfied) {
        satisfied = false
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
            if (!bestOptions) {
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
    const num = Number(value)
    return Number.isNaN(num) || num.toString() !== value ? value : num
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
}
