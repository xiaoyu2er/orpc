import type { HTTPPath } from './types'

export function standardizeHTTPPath(path: HTTPPath): HTTPPath {
  return `/${path.replace(/\/{2,}/g, '/').replace(/^\/|\/$/g, '')}`
}

export function prefixHTTPPath(prefix: HTTPPath, path: HTTPPath): HTTPPath {
  const prefix_ = standardizeHTTPPath(prefix)
  const path_ = standardizeHTTPPath(path)

  if (prefix_ === '/') return path_
  if (path_ === '/') return prefix_

  return `${prefix_}${path_}`
}
