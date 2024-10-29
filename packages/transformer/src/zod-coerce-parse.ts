import { copy } from 'copy-anything'
import { guard } from 'radash'
import type { TypeOf, ZodError, ZodIssue, ZodParsedType, ZodType } from 'zod'
import { getObject } from './utils/get-object'
import { setObject } from './utils/set-object'

/**
 * Parse data with auto-fixing of type issues when possible
 *
 * For example: when the data is a string, but the schema expects a number,
 * it will try to convert the string to a number automatically
 */
export function coerceParse<T extends ZodType>(
  schema: T,
  data: unknown,
): TypeOf<T> {
  const first = schema.safeParse(data)

  if (first.success) {
    return first.data
  }

  const fixes = fixTypeIssues(data, first.error.issues)

  const errors: ZodError[] = []
  for (const fixed of fixes) {
    const result = schema.safeParse(fixed)
    if (result.success) {
      return result.data
    }

    errors.push(result.error)
  }

  if (errors.length === 0) {
    throw first.error
  }

  if (errors.length === 1) {
    throw errors[0]
  }

  const countIssues = errors.map((error) => countTypeIssues(error.issues))

  throw errors[countIssues.indexOf(Math.min(...countIssues))]
}

/**
 * Fix the data based on the identified type issues from the zod
 * @returns all versions of the data that can be parsed by the schema
 */
export function fixTypeIssues(data: unknown, issues: ZodIssue[]): unknown[] {
  const ref = { value: copy(data) }

  for (const issue of issues) {
    if (issue.code === 'invalid_type') {
      const path = ['value', ...issue.path.map((v) => v.toString())] as const
      const val = getObject(ref, path)
      const coerced = coerceType(val, issue.expected)

      if (coerced !== val) {
        setObject(ref, path, coerced)
      }
    }
  }

  let fixes: unknown[] = [ref.value]
  for (const issue of issues) {
    if (issue.code === 'invalid_union') {
      fixes = issue.unionErrors.flatMap((unionError) => {
        return fixes.flatMap((fixed) => fixTypeIssues(fixed, unionError.issues))
      })
    }
  }

  return fixes
}

export function countTypeIssues(issues: ZodIssue[]): number {
  let count = 0

  for (const issue of issues) {
    if (issue.code === 'invalid_type') {
      count++
    }

    if (issue.code === 'invalid_union') {
      for (const unionError of issue.unionErrors) {
        count += countTypeIssues(unionError.issues)
      }
    }
  }

  return count
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
