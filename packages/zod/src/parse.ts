import { copy } from 'copy-anything'
import type { TypeOf, ZodError, ZodIssue, ZodType } from 'zod'
import { coerceType } from './utils'
import { get, set } from './utils'

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
      const path = ['value', ...issue.path]
      const val = get(ref, path)
      const coerced = coerceType(val, issue.expected)

      if (coerced !== val) {
        set(ref, path, coerced)
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
