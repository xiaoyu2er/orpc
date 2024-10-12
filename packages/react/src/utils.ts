export function get(obj: any, path: string[]): unknown {
  let obj_ = obj
  for (const key of path) {
    obj_ = obj_[key]
  }
  return obj_
}
