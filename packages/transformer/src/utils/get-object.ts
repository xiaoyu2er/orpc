export function getObject(obj: any, path: readonly (string | number)[]): any {
  return path.reduce((acc, key) => acc?.[key], obj)
}
