import { copy } from 'copy-anything'
import { guard } from 'radash'
import {
  type TypeOf,
  ZodError,
  type ZodInvalidTypeIssue,
  type ZodIssue,
  type ZodType,
} from 'zod'
import { get, set } from './utils'

/**
 * Auto fix the type issues when possible
 *
 * For example: when the data is a string, but the schema is a number, it will try to convert the string to a number automatically
 */
export function smartParse<T extends ZodType>(
  schema: T,
  data: unknown,
): TypeOf<T> {
  const first = schema.safeParse(data)

  if (first.success) {
    return first.data
  }

  const branches = findTypeIssuesBranches(first.error.issues)

  if (!branches.length) {
    throw first.error
  }

  const errors: ZodError[] = []

  for (const typeIssues of branches) {
    const fixedData = fixTypeIssues(data, typeIssues)

    const result = schema.safeParse(fixedData)
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

  throw new ZodError([
    {
      code: 'invalid_union',
      unionErrors: errors,
      path: [],
      message: 'Invalid union',
    },
  ])
}

/**
 * @returns an array of branches, each branch contain all type issues
 */
export function findTypeIssuesBranches(
  issues: ZodIssue[],
): ZodInvalidTypeIssue[][] {
  const rootTypeIssues: ZodInvalidTypeIssue[] = []
  for (const issue of issues) {
    if (issue.code === 'invalid_type') {
      rootTypeIssues.push(issue)
    }
  }

  const branches: ZodInvalidTypeIssue[][] = []
  for (const issue of issues) {
    if (issue.code === 'invalid_union') {
      for (const unionError of issue.unionErrors) {
        const unionBranches = findTypeIssuesBranches(unionError.issues)

        for (const unionTypeIssues of unionBranches) {
          branches.push([...rootTypeIssues, ...unionTypeIssues])
        }
      }
    }
  }

  return branches.length === 0
    ? rootTypeIssues.length === 0
      ? []
      : [rootTypeIssues]
    : branches
}

/**
 * Clone the data and fix types issues
 */
export function fixTypeIssues(
  data: unknown,
  issues: ZodInvalidTypeIssue[],
): unknown {
  const clone = { value: copy(data) }

  for (const issue of issues) {
    const path = ['value', ...issue.path]
    const val = get(clone, path)

    // PRIMITIVE
    if (canSafeConvertToPrimitive(val)) {
      switch (issue.expected) {
        case 'string': {
          set(clone, path, String(val))
          break
        }

        case 'number':
        case 'integer':
        case 'float': {
          const num = Number(val)
          if (!Number.isNaN(num)) {
            set(clone, path, num)
          }
          break
        }

        case 'bigint': {
          const num = guard(() => BigInt(val))
          if (num !== undefined) {
            set(clone, path, num)
          }
          break
        }

        case 'nan': {
          set(clone, path, Number(val))
          break
        }

        case 'boolean': {
          if (
            val === 'false' ||
            val === 'False' ||
            val === 'off' ||
            val === '0'
          ) {
            set(clone, path, false)
          } else {
            set(clone, path, Boolean(val))
          }

          break
        }

        case 'date': {
          set(clone, path, new Date(val))
          break
        }

        case 'null': {
          if (val === 'null') {
            set(clone, path, null)
          }
          break
        }

        case 'void':
        case 'undefined': {
          if (val === 'undefined') {
            set(clone, path, undefined)
          }
          break
        }
      }
    }

    // SET
    if (issue.expected === 'set' && canSafeConvertToSet(val)) {
      set(clone, path, new Set(val))
    }

    // MAP
    else if (issue.expected === 'map' && canSafeConvertToMap(val)) {
      set(clone, path, new Map(val))
    }
  }

  return clone.value
}

export function canSafeConvertToPrimitive(data: unknown): boolean {
  return typeof data === 'string' || typeof data === 'number'
}

export function canSafeConvertToSet(data: unknown): boolean {
  return Array.isArray(data)
}

export function canSafeConvertToMap(data: unknown): boolean {
  return (
    Array.isArray(data) && data.every((i) => Array.isArray(i) && i.length === 2)
  )
}
