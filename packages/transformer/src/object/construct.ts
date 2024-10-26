export function construct(
  payload: [string, unknown][],
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of payload) {
    // Special case: empty key
    if (!key) {
      result.a = value
      continue
    }

    const parsedKey = parseKey(key)
    let current: Record<string, unknown> | unknown[] = result

    for (let i = 0; i < parsedKey.length - 1; i++) {
      const segment = parsedKey[i]!
      const nextSegment = parsedKey[i + 1]!

      if (segment === '') {
        // Handle empty array segment
        const arr = current as unknown[]
        // Check if we can use the last object in the array
        const lastItem = arr.length > 0 ? arr[arr.length - 1] : null
        const nextIsProperty = nextSegment !== ''

        if (
          nextIsProperty &&
          lastItem &&
          typeof lastItem === 'object' &&
          !(nextSegment in lastItem)
        ) {
          // If last item exists and doesn't have the next property, use it
          current = lastItem as any
        } else {
          // Otherwise create new object/array
          const newValue = nextSegment === '' ? [] : {}
          arr.push(newValue)
          current = newValue
        }
      } else {
        const isNextNumeric = !Number.isNaN(Number(nextSegment))

        if (!(segment in current)) {
          // If next segment is numeric or empty string, initialize as array
          ;(current as Record<string, unknown>)[segment] =
            nextSegment === '' || isNextNumeric ? [] : {}
        }
        current = (current as Record<string, unknown>)[segment] as
          | Record<string, unknown>
          | unknown[]
      }
    }

    const lastKey = parsedKey[parsedKey.length - 1]!
    if (lastKey === '') {
      // Handle array append
      ;(current as unknown[]).push(value)
    } else if (!Number.isNaN(Number(lastKey))) {
      // Handle numeric index as array
      const arr = current as unknown[]
      arr[Number(lastKey)] = value
    } else {
      // Handle object assignment
      ;(current as Record<string, unknown>)[lastKey] = value
    }
  }

  return result
}

export function parseKey(key: string): string[] {
  const matches = key.match(/^([^\[]+)(\[([^\]]*)\])*$/)
  if (!matches) return [key]

  const parts: string[] = []
  parts.push(matches[1]!)

  const bracketRegex = /\[([^\]]*)\]/g
  while (true) {
    const bracketMatch = bracketRegex.exec(matches[0])
    if (!bracketMatch) break
    parts.push(bracketMatch[1]!)
  }

  return parts
}
