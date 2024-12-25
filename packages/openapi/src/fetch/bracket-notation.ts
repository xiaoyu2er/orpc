import { isPlainObject } from '@orpc/shared'

/**
 * Serialize an object or array into a list of [key, value] pairs.
 * The key will express by using bracket-notation.
 *
 * Notice: This way cannot express the empty object or array.
 *
 * @example
 * ```ts
 * const payload = {
 *  name: 'John Doe',
 *  pets: ['dog', 'cat'],
 * }
 *
 * const entities = serialize(payload)
 *
 * expect(entities).toEqual([
 *  ['name', 'John Doe'],
 *  ['name[pets][0]', 'dog'],
 *  ['name[pets][1]', 'cat'],
 * ])
 * ```
 */
export function serialize(
  payload: unknown,
  parentKey = '',
): [string, unknown][] {
  if (!Array.isArray(payload) && !isPlainObject(payload))
    return [['', payload]]

  const result: [string, unknown][] = []

  function helper(value: unknown, path: string[]) {
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        helper(item, [...path, String(index)])
      })
    }
    else if (isPlainObject(value)) {
      for (const [key, val] of Object.entries(value)) {
        helper(val, [...path, key])
      }
    }
    else {
      result.push([stringifyPath(path as [string, ...string[]]), value])
    }
  }

  helper(payload, parentKey ? [parentKey] : [])
  return result
}

/**
 * Deserialize a list of [key, value] pairs into an object or array.
 * The key is expressed by using bracket-notation.
 *
 * @example
 * ```ts
 * const entities = [
 *  ['name', 'John Doe'],
 *  ['name[pets][0]', 'dog'],
 *  ['name[pets][1]', 'cat'],
 *  ['name[dogs][]', 'hello'],
 *  ['name[dogs][]', 'kitty'],
 * ]
 *
 * const payload = deserialize(entities)
 *
 * expect(payload).toEqual({
 *  name: 'John Doe',
 *  pets: { 0: 'dog', 1: 'cat' },
 *  dogs: ['hello', 'kitty'],
 * })
 * ```
 */
export function deserialize(
  entities: readonly (readonly [string, unknown])[],
): Record<string, unknown> | unknown[] | undefined {
  if (entities.length === 0) {
    return undefined
  }

  // Only treat empty strings as root array indicators
  const isRootArray = entities.every(([path]) => path === '')

  // Initialize result based on whether we have a root array
  const result: Record<string, unknown> | unknown[] = isRootArray ? [] : {}
  const arrayPushPaths = new Set<string>()

  // First pass: identify pure array push paths (only [] notation used)
  for (const [path, _] of entities) {
    const segments = parsePath(path)
    const base = segments.slice(0, -1).join('.')
    const last = segments[segments.length - 1]

    if (last === '') {
      arrayPushPaths.add(base)
    }
    else {
      arrayPushPaths.delete(base)
    }
  }

  // Helper function to set nested value
  function setValue(
    obj: Record<string, unknown> | unknown[],
    segments: [string, ...string[]],
    value: unknown,
    fullPath: string,
  ): void {
    const [first, ...rest_] = segments

    // Special handling for root array
    if (Array.isArray(obj) && first === '') {
      ; (obj as unknown[]).push(value)
      return
    }

    // Cast obj to Record for non-array cases
    const objAsRecord = obj as Record<string, unknown>

    // Base case - no more segments
    if (rest_.length === 0) {
      objAsRecord[first] = value
      return
    }

    const rest = rest_ as [string, ...string[]]

    // Handle array push style ([])
    if (rest[0] === '') {
      const pathToCheck = segments.slice(0, -1).join('.')

      // Check if this path is only used with [] notation
      if (rest.length === 1 && arrayPushPaths.has(pathToCheck)) {
        if (!(first in objAsRecord)) {
          objAsRecord[first] = []
        }
        if (Array.isArray(objAsRecord[first])) {
          ; (objAsRecord[first] as unknown[]).push(value)
          return
        }
      }

      // If not a pure array push case, treat it as an object with empty string key
      if (!(first in objAsRecord)) {
        objAsRecord[first] = {}
      }
      const target = objAsRecord[first] as Record<string, unknown>
      target[''] = value
      return
    }

    // Create nested object if it doesn't exist
    if (!(first in objAsRecord)) {
      objAsRecord[first] = {}
    }

    // Recurse into nested object
    setValue(
      objAsRecord[first] as Record<string, unknown>,
      rest,
      value,
      fullPath,
    )
  }

  // Process each entity
  for (const [path, value] of entities) {
    const segments = parsePath(path)
    setValue(result, segments, value, path)
  }

  return result
}

/**
 * Escape the `[`, `]`, and `\` chars in a path segment.
 *
 * @example
 * ```ts
 * expect(escapeSegment('name[pets')).toEqual('name\\[pets')
 * ```
 */
export function escapeSegment(segment: string): string {
  return segment.replace(/[\\[\]]/g, (match) => {
    switch (match) {
      case '\\':
        return '\\\\'
      case '[':
        return '\\['
      case ']':
        return '\\]'
      default:
        return match
    }
  })
}

/**
 * Convert an array of path segments into a path string using bracket-notation.
 *
 * For the special char `[`, `]`, and `\` will be escaped by adding `\` at start.
 *
 * @example
 * ```ts
 * expect(stringifyPath(['name', 'pets', '0'])).toEqual('name[pets][0]')
 * ```
 */
export function stringifyPath(path: readonly [string, ...string[]]): string {
  const [first, ...rest] = path

  // Handle first segment (escape brackets if present)
  const firstSegment = escapeSegment(first)

  // If first segment is empty, start with empty string
  const base = first === '' ? '' : firstSegment

  // Convert remaining segments to bracket notation
  // and escape any brackets within the segments
  return rest.reduce(
    (result, segment) => `${result}[${escapeSegment(segment)}]`,
    base,
  )
}

/**
 * Convert a path string using bracket-notation into an array of path segments.
 *
 * For the special char `[`, `]`, and `\` you should escape by adding `\` at start.
 * It only treats a pair `[${string}]` as a path segment.
 * If missing or escape it will bypass and treat as normal string.
 *
 * @example
 * ```ts
 * expect(parsePath('name[pets][0]')).toEqual(['name', 'pets', '0'])
 * expect(parsePath('name[pets][0')).toEqual(['name', 'pets', '[0'])
 * expect(parsePath('name[pets[0]')).toEqual(['name', 'pets[0')
 * expect(parsePath('name\\[pets][0]')).toEqual(['name[pets]', '0'])
 * ```
 */
export function parsePath(path: string): [string, ...string[]] {
  if (path === '')
    return ['']

  const result: string[] = []
  let currentSegment = ''
  let inBracket = false
  let bracketContent = ''
  let backslashCount = 0

  for (let i = 0; i < path.length; i++) {
    const char = path[i]

    // Count consecutive backslashes
    if (char === '\\') {
      backslashCount++
      continue
    }

    // Handle the accumulated backslashes when we hit a non-backslash
    if (backslashCount > 0) {
      // For even number of backslashes, add half of them as literal backslashes
      const literalBackslashes = '\\'.repeat(Math.floor(backslashCount / 2))

      if (char === '[' || char === ']') {
        // If odd number of backslashes, the last one escapes the bracket
        if (backslashCount % 2 === 1) {
          if (inBracket) {
            bracketContent += literalBackslashes + char
          }
          else {
            currentSegment += literalBackslashes + char
          }
        }
        else {
          // Even number means the bracket is not escaped
          if (inBracket) {
            bracketContent += literalBackslashes
          }
          else {
            currentSegment += literalBackslashes
          }

          if (char === '[' && !inBracket) {
            if (currentSegment !== '' || result.length === 0) {
              result.push(currentSegment)
            }
            inBracket = true
            bracketContent = ''
            currentSegment = ''
          }
          else if (char === ']' && inBracket) {
            result.push(bracketContent)
            inBracket = false
            bracketContent = ''
          }
          else {
            if (inBracket) {
              bracketContent += char
            }
            else {
              currentSegment += char
            }
          }
        }
      }
      else {
        // For non-bracket characters, just add all backslashes as literals
        const allBackslashes = '\\'.repeat(backslashCount)
        if (inBracket) {
          bracketContent += allBackslashes + char
        }
        else {
          currentSegment += allBackslashes + char
        }
      }
      backslashCount = 0
      continue
    }

    // Handle unescaped brackets
    if (char === '[' && !inBracket) {
      if (currentSegment !== '' || result.length === 0) {
        result.push(currentSegment)
      }
      inBracket = true
      bracketContent = ''
      currentSegment = ''
      continue
    }

    if (char === ']' && inBracket) {
      result.push(bracketContent)
      inBracket = false
      bracketContent = ''
      continue
    }

    // Add normal characters
    if (inBracket) {
      bracketContent += char
    }
    else {
      currentSegment += char
    }
  }

  // Handle any remaining backslashes at the end
  if (backslashCount > 0) {
    const remainingBackslashes = '\\'.repeat(backslashCount)
    if (inBracket) {
      bracketContent += remainingBackslashes
    }
    else {
      currentSegment += remainingBackslashes
    }
  }

  // Handle any remaining content
  if (inBracket) {
    if (currentSegment !== '' || result.length === 0) {
      result.push(currentSegment)
    }
    result.push(`[${bracketContent}`)
  }
  else if (currentSegment !== '' || result.length === 0) {
    result.push(currentSegment)
  }

  return result as [string, ...string[]]
}
