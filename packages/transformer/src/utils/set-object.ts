export function setObject(
  obj: object,
  path: readonly string[],
  value: any,
): void {
  const path_ = [...path]
  const lastKey = path_.pop()
  if (lastKey === undefined) return

  const target = path_.reduce((acc, key) => {
    return acc[key]
  }, obj as any)

  target[lastKey] = value
}
