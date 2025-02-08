/** unnoq */

import { setOperationExtender } from './openapi-operation-extender'

export * from './json-serializer'
export * from './openapi'
export * from './openapi-content-builder'
export * from './openapi-generator'
export * from './openapi-operation-extender'
export * from './openapi-parameters-builder'
export * from './openapi-path-parser'
export * from './schema'
export * from './schema-converter'
export * from './schema-utils'
export * from './utils'

export const oo = {
  spec: setOperationExtender,
}
