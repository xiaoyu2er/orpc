import { guard } from 'radash'
import type { ZodParsedType } from 'zod'

export function get(obj: any, path: (string | number)[]): any {
  return path.reduce((acc, key) => acc?.[key], obj)
}

export function set(obj: any, path: (string | number)[], value: any): void {
  const lastKey = path.pop()
  if (lastKey === undefined) return

  const target = path.reduce((acc, key) => {
    if (!(key in acc)) acc[key] = {}
    return acc[key]
  }, obj)

  target[lastKey] = value
}

export function coerceType(value: unknown, expected: ZodParsedType): unknown {
  if (expected === 'string') {
    if (typeof value === 'number') {
      return String(value)
    }

    return value
  }

  if (expected === 'number' || expected === 'integer' || expected === 'float') {
    if (typeof value === 'string') {
      const num = Number(value)
      if (!Number.isNaN(num)) {
        return num
      }
    }

    return value
  }

  if (expected === 'bigint') {
    if (typeof value === 'string' || typeof value === 'number') {
      const num = guard(() => BigInt(value))
      if (num !== undefined) {
        return num
      }
    }

    return value
  }

  if (expected === 'nan') {
    if (typeof value === 'string') {
      return Number(value)
    }

    return value
  }

  if (expected === 'boolean') {
    if (typeof value === 'string' || typeof value === 'number') {
      const lower = value.toString().toLowerCase()

      if (lower === 'false' || lower === 'off' || lower === '0') {
        return false
      }

      return Boolean(value)
    }

    return value
  }

  if (expected === 'date') {
    if (
      typeof value === 'string' &&
      (value.includes('-') || value.includes(':'))
    ) {
      return new Date(value)
    }

    return value
  }

  if (expected === 'null') {
    if (typeof value === 'string' && value === 'null') {
      return null
    }

    return value
  }

  if (expected === 'void' || expected === 'undefined') {
    if (typeof value === 'string' && value === 'undefined') {
      return undefined
    }

    return value
  }

  if (expected === 'object') {
    if (Array.isArray(value)) {
      return { ...value }
    }

    return value
  }

  if (expected === 'set') {
    if (Array.isArray(value)) {
      return new Set(value)
    }

    return value
  }

  if (expected === 'map') {
    if (
      Array.isArray(value) &&
      value.every((i) => Array.isArray(i) && i.length === 2)
    ) {
      return new Map(value)
    }

    return value
  }

  return value
}
