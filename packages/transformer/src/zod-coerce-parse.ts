import { copy } from 'copy-anything'
import { isPlainObject } from 'is-what'
import { guard } from 'radash'
import type { TypeOf, ZodError, ZodIssue, ZodParsedType, ZodType } from 'zod'
import { getObject } from './utils/get-object'
import { setObject } from './utils/set-object'

/**
 *
 */
export interface CoerceParseOptions {
  /**
   * Whether to fix bracket-notation in the data.
   *
   * @default false
   */
  bracketNotation?: boolean
}

/**
 * Parse data with auto-fixing of type issues when possible
 *
 * Notice: designed to fix the limitations of OpenAPI transformer and bracket-notation.
 *
 * @example when the data is a string, but the schema expects a number,
 * it will try to convert the string to a number automatically
 * ```ts
 * const schema = z.number()
 * const data = '123'
 *
 * expect(() => schema.parse(data)).toThrowError()
 * expect(coerceParse(schema, data)).toEqual(123)
 * ```
 *
 */
export function coerceParse<T extends ZodType>(
  schema: T,
  data: unknown,
  options?: CoerceParseOptions,
): TypeOf<T> {
  const first = schema.safeParse(data)

  if (first.success) {
    return first.data
  }

  // TODO: prioritize the fixes
  const fixes = fixTypeIssues(data, first.error.issues, options ?? {})

  const errors: ZodError[] = []
  for (const fixed of fixes) {
    const result = schema.safeParse(fixed.data)
    if (result.success) {
      return result.data
    }

    if (fixed.structureFix) {
      fixes.push(
        ...fixTypeIssues(fixed.data, result.error.issues, options ?? {}),
      )
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
function fixTypeIssues(
  data: unknown,
  issues: ZodIssue[],
  options: CoerceParseOptions,
): { data: unknown; structureFix?: boolean; priority?: number }[] {
  let structureFix: boolean | undefined
  let priority: number | undefined
  const ref = { value: copy(data) }

  for (const issue of issues) {
    if (issue.code === 'invalid_type') {
      const path = ['value', ...issue.path.map((v) => v.toString())] as const
      const val = getObject(ref, path)
      const coerced = coerceType(val, issue.expected, options)

      if (coerced !== val) {
        structureFix ||= coerced.structureFix
        priority = Math.min(
          priority ?? Number.MAX_SAFE_INTEGER,
          coerced.priority ?? Number.MAX_SAFE_INTEGER,
        )
        setObject(ref, path, coerced.value)
      }
    }
  }

  let fixes: { data: unknown; structureFix?: boolean; priority?: number }[] = [
    { data: ref.value, structureFix, priority },
  ]
  for (const issue of issues) {
    if (issue.code === 'invalid_union') {
      fixes = issue.unionErrors.flatMap((unionError) => {
        return fixes.flatMap((fixed) => {
          const result = fixTypeIssues(fixed.data, unionError.issues, options)

          return result.map((r) => ({
            ...r,
            structureFix: r.structureFix || fixed.structureFix,
            priority: Math.min(
              r.priority ?? Number.MAX_SAFE_INTEGER,
              fixed.priority ?? Number.MAX_SAFE_INTEGER,
            ),
          }))
        })
      })
    }
  }

  return fixes
}

function countTypeIssues(issues: ZodIssue[]): number {
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

function coerceType(
  value: unknown,
  expected: ZodParsedType,
  options: CoerceParseOptions,
): { value: unknown; structureFix?: boolean; priority?: number } {
  if (expected === 'number' || expected === 'integer' || expected === 'float') {
    if (options.bracketNotation && typeof value === 'string') {
      if (typeof value === 'string') {
        const num = Number(value)
        if (!Number.isNaN(num)) {
          return { value: num }
        }
      }
    }
  }

  //
  else if (expected === 'boolean') {
    if (options.bracketNotation && typeof value === 'string') {
      const lower = value.toLowerCase()

      if (
        lower === 'false' ||
        lower === 'off' ||
        lower === '0' ||
        lower === ''
      ) {
        return { value: false }
      }

      return { value: true }
    }
  }

  //
  else if (expected === 'null') {
    if (options.bracketNotation && value === undefined) {
      return { value: null, priority: 0 }
    }
  }

  //
  else if (expected === 'nan') {
    if (value === undefined || value === null) {
      return { value: Number.NaN, priority: 1 }
    }
  }

  //
  else if (expected === 'bigint') {
    if (typeof value === 'string') {
      const num = guard(() => BigInt(value))
      if (num !== undefined) {
        return { value: num }
      }
    }
  }

  //
  else if (expected === 'date') {
    if (
      typeof value === 'string' &&
      (value.includes('-') || value.includes(':'))
    ) {
      return { value: new Date(value) }
    }
  }

  //
  else if (expected === 'object') {
    if (options.bracketNotation) {
      if (value === undefined) {
        return { value: {} }
      }

      if (Array.isArray(value)) {
        return { value: { '': value.at(-1) }, structureFix: true }
      }
    }
  }

  //
  else if (expected === 'array') {
    if (options.bracketNotation) {
      if (value === undefined) {
        return { value: [] }
      }

      if (
        isPlainObject(value) &&
        Object.keys(value).every((k) => /^[1-9][0-9]*$/.test(k) || k === '0')
      ) {
        const lastIndex = Math.max(...Object.keys(value).map((k) => Number(k)))
        const arr = new Array(lastIndex + 1)
        for (const [k, v] of Object.entries(value)) {
          arr[Number(k)] = v
        }

        return { value: arr, structureFix: true }
      }
    }
  }

  //
  else if (expected === 'set') {
    if (Array.isArray(value)) {
      return { value: new Set(value), structureFix: true }
    }

    if (
      options.bracketNotation &&
      isPlainObject(value) &&
      Object.keys(value).every((k) => /^[1-9][0-9]*$/.test(k) || k === '0')
    ) {
      const lastIndex = Math.max(...Object.keys(value).map((k) => Number(k)))
      const arr = new Array(lastIndex + 1)
      for (const [k, v] of Object.entries(value)) {
        arr[Number(k)] = v
      }
      const set = new Set(arr)
      return { value: set, structureFix: true }
    }
  }

  //
  else if (expected === 'map') {
    if (
      Array.isArray(value) &&
      value.every((i) => Array.isArray(i) && i.length === 2)
    ) {
      return { value: new Map(value), structureFix: true }
    }

    if (options.bracketNotation) {
      if (isPlainObject(value)) {
        const arr = new Array(Object.keys(value).length).map((_, i) =>
          isPlainObject(value[i]) &&
          Object.keys(value[i]).length === 2 &&
          '0' in value[i] &&
          '1' in value[i]
            ? ([value[i]['0'], value[i]['1']] as const)
            : undefined,
        )

        if (arr.every((v) => !!v)) {
          return { value: new Map(arr) }
        }
      }
    }
  }

  return { value }
}
