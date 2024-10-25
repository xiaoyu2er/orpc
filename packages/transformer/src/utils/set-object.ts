export function setObject(obj: object, path: string[], value: any): void {
  const lastKey = path.pop()
  if (lastKey === undefined) return

  const target = path.reduce((acc, key) => {
    return acc[key]
  }, obj as any)

  target[lastKey] = value
}
