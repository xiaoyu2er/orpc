export function get(obj: any, path: (string | number)[]): any {
  return path.reduce((acc, key) => acc?.[key], obj)
}

export function set(obj: any, path: (string | number)[], value: any): void {
  const lastKey = path.pop()
  if (lastKey === undefined) return

  const target = path.reduce((acc, key) => {
    if (!(key in acc)) acc[key] = {}
    return acc[key]
  }, obj)

  target[lastKey] = value
}
