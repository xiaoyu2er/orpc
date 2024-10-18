import { copy } from 'copy-anything'
import {
  type TypeOf,
  ZodError,
  type ZodInvalidTypeIssue,
  type ZodIssue,
  type ZodType,
} from 'zod'
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

  const branches = findTypeIssueBranches(first.error.issues)

  if (!branches.length) {
    throw first.error
  }

  const errors: ZodError[] = []

  for (const typeIssues of branches) {
    const fixedData = applyTypeFixesToData(data, typeIssues)

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
 * Find all possible branches of type issues to fix
 * @returns an array of branches, each branch containing all type issues for that path
 */
export function findTypeIssueBranches(
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
        const unionBranches = findTypeIssueBranches(unionError.issues)

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
 * Clone the data and apply type fixes based on the identified issues
 */
export function applyTypeFixesToData(
  data: unknown,
  issues: ZodInvalidTypeIssue[],
): unknown {
  const clone = { value: copy(data) }

  for (const issue of issues) {
    const path = ['value', ...issue.path]
    const val = get(clone, path)

    const coerced = coerceType(val, issue.expected)

    if (coerced !== val) {
      set(clone, path, coerced)
    }
  }

  return clone.value
}
