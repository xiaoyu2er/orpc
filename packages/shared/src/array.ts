export function toArray<T>(value: T | T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : value === undefined || value === null ? [] : [value]
}
