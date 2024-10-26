export function crush(
  payload:
    | Record<string | number, unknown>
    | unknown[]
    | Set<unknown>
    | Map<unknown, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  function crushRecursive(obj: unknown, path = '') {
    if (
      obj === null ||
      (typeof obj !== 'object' &&
        !(obj instanceof Set) &&
        !(obj instanceof Map))
    ) {
      result[path] = obj
      return
    }

    // Handle Sets
    if (obj instanceof Set) {
      if (obj.size === 0) {
        result[path] = new Set()
        return
      }

      let index = 0
      for (const item of obj) {
        const newPath = path ? `${path}[${index}]` : `[${index}]`
        crushRecursive(item, newPath)
        index++
      }
      return
    }

    // Handle Maps
    if (obj instanceof Map) {
      if (obj.size === 0) {
        result[path] = new Map()
        return
      }

      let index = 0
      for (const [key, value] of obj) {
        // Treat each entry as a pair
        const entryPath = path ? `${path}[${index}]` : `[${index}]`
        crushRecursive(key, `${entryPath}[0]`)
        crushRecursive(value, `${entryPath}[1]`)
        index++
      }
      return
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      if (obj.length === 0) {
        result[path] = []
        return
      }

      let index = 0
      for (const item of obj) {
        const newPath = path ? `${path}[${index}]` : `[${index}]`
        crushRecursive(item, newPath)
        index++
      }
      return
    }

    // Handle regular objects
    const entries = Object.entries(obj)
    if (entries.length === 0) {
      result[path] = {}
      return
    }

    for (const [key, value] of entries) {
      const newPath = path ? `${path}[${key}]` : key
      crushRecursive(value, newPath)
    }
  }

  crushRecursive(payload)
  return result
}
