import type { HTTPMethod, HTTPPath } from '@orpc/contract'
import type { OpenAPI } from './openapi'
import type { FileSchema, JSONSchema } from './schema'
import { findDeepMatches, isObject } from '@orpc/shared'
import { filterSchemaBranches, isFileSchema, toJSONSchemaObject } from './schema-utils'

/**
 * @internal
 */
export function standardizeHTTPPath(path: HTTPPath): HTTPPath {
  return `/${path.replace(/\/{2,}/g, '/').replace(/^\/|\/$/g, '')}`
}

/**
 * @internal
 */
export function toOpenAPIPath(path: HTTPPath): string {
  return standardizeHTTPPath(path).replace(/\/\{\+([^}]+)\}/g, '/{$1}')
}

/**
 * @internal
 */
export function toOpenAPIMethod(method: HTTPMethod): string {
  return method.toLocaleLowerCase()
}

/**
 * @internal
 */
export function getDynamicParams(path: HTTPPath | undefined): string[] | undefined {
  return path
    ? standardizeHTTPPath(path).match(/\/\{([^}]+)\}/g)?.map(v => v.match(/\{\+?([^}]+)\}/)![1]!)
    : undefined
}

/**
 * @internal
 */
export function toOpenAPIContent(schema: JSONSchema): Exclude<OpenAPI.ResponseObject['content'] & OpenAPI.RequestBodyObject['content'], undefined> {
  const content: Exclude<OpenAPI.ResponseObject['content'] | OpenAPI.RequestBodyObject['content'], undefined> = {}

  const [matches, restSchema] = filterSchemaBranches(schema, isFileSchema)

  for (const file of matches as FileSchema[]) {
    content[file.contentMediaType] = {
      schema: file,
    }
  }

  if (restSchema !== undefined) {
    content['application/json'] = {
      schema: toJSONSchemaObject(restSchema),
    }

    const isStillHasFileSchema = findDeepMatches(v => isObject(v) && isFileSchema(v), restSchema).values.length > 0

    if (isStillHasFileSchema) {
      content['multipart/form-data'] = {
        schema: toJSONSchemaObject(restSchema),
      }
    }
  }

  return content
}

/**
 * @internal
 */
export function toOpenAPIEventIteratorContent(
  [dataRequired, dataSchema]: [boolean, JSONSchema],
  [returnsRequired, returnsSchema]: [boolean, JSONSchema],
): Exclude<OpenAPI.ResponseObject['content'] | OpenAPI.RequestBodyObject['content'], undefined> {
  return {
    'text/event-stream': {
      schema: {
        oneOf: [
          {
            type: 'object',
            properties: {
              event: { const: 'message' },
              data: dataSchema,
              id: { type: 'string' },
              retry: { type: 'number' },
            },
            required: dataRequired ? ['event', 'data'] : ['event'],
          },
          {
            type: 'object',
            properties: {
              event: { const: 'done' },
              data: returnsSchema,
              id: { type: 'string' },
              retry: { type: 'number' },
            },
            required: returnsRequired ? ['event', 'data'] : ['event'],
          },
          {
            type: 'object',
            properties: {
              event: { const: 'error' },
              data: {},
              id: { type: 'string' },
              retry: { type: 'number' },
            },
            required: ['event'],
          },
        ],
      },
    },
  }
}
