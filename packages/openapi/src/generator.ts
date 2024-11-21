import type { JSONSchema } from 'json-schema-typed/draft-2020-12'
import { type ContractRouter, eachContractRouterLeaf } from '@orpc/contract'
import { type Router, toContractRouter } from '@orpc/server'
import { findDeepMatches, isPlainObject, omit } from '@orpc/shared'
import { preSerialize } from '@orpc/transformer'
import {
  type MediaTypeObject,
  OpenApiBuilder,
  type OpenAPIObject,
  type OperationObject,
  type ParameterObject,
  type RequestBodyObject,
  type ResponseObject,
} from 'openapi3-ts/oas31'
import {
  extractJSONSchema,
  UNSUPPORTED_JSON_SCHEMA,
  zodToJsonSchema,
} from './zod-to-json-schema'

// Reference: https://spec.openapis.org/oas/v3.1.0.html#style-values

export interface GenerateOpenAPIOptions {
  /**
   * Throw error when you missing define tag definition on OpenAPI root tags
   *
   * Example: if procedure has tags ['foo', 'bar'], and OpenAPI root tags is ['foo'], then error will be thrown
   * Because OpenAPI root tags is missing 'bar' tag
   *
   * @default false
   */
  throwOnMissingTagDefinition?: boolean

  /**
   * Weather ignore procedures that has no path defined.
   *
   * @default false
   */
  ignoreUndefinedPathProcedures?: boolean
}

export function generateOpenAPI(
  opts: {
    router: ContractRouter | Router<any>
  } & Omit<OpenAPIObject, 'openapi'>,
  options?: GenerateOpenAPIOptions,
): OpenAPIObject {
  const throwOnMissingTagDefinition
    = options?.throwOnMissingTagDefinition ?? false
  const ignoreUndefinedPathProcedures
    = options?.ignoreUndefinedPathProcedures ?? false

  const builder = new OpenApiBuilder({
    ...omit(opts, ['router']),
    openapi: '3.1.0',
  })

  const rootTags = opts.tags?.map(tag => tag.name) ?? []
  const router = toContractRouter(opts.router)

  eachContractRouterLeaf(router, (procedure, path_) => {
    const internal = procedure.zz$cp

    if (ignoreUndefinedPathProcedures && internal.path === undefined) {
      return
    }

    const path = internal.path ?? `/${path_.map(encodeURIComponent).join('/')}`
    const method = internal.method ?? 'POST'

    let inputSchema = internal.InputSchema
      ? zodToJsonSchema(internal.InputSchema, { mode: 'input' })
      : {}
    const outputSchema = internal.OutputSchema
      ? zodToJsonSchema(internal.OutputSchema, { mode: 'output' })
      : {}

    const params: ParameterObject[] | undefined = (() => {
      const names = path.match(/\{([^}]+)\}/g)

      if (!names || !names.length) {
        return undefined
      }

      if (typeof inputSchema !== 'object' || inputSchema.type !== 'object') {
        throw new Error(
          `When path has parameters, input schema must be an object [${path_.join('.')}]`,
        )
      }

      return names
        .map(raw => raw.slice(1, -1))
        .map((name) => {
          let schema = inputSchema.properties?.[name]
          const required = inputSchema.required?.includes(name)

          if (schema === undefined) {
            throw new Error(
              `Parameter ${name} is missing in input schema [${path_.join('.')}]`,
            )
          }

          if (!required) {
            throw new Error(
              `Parameter ${name} must be required in input schema [${path_.join('.')}]`,
            )
          }

          const examples = inputSchema.examples
            ?.filter((example) => {
              return isPlainObject(example) && name in example
            })
            .map((example) => {
              return example[name]
            })

          schema = {
            examples: examples?.length ? examples : undefined,
            ...(schema === true
              ? {}
              : schema === false
                ? UNSUPPORTED_JSON_SCHEMA
                : schema),
          }

          inputSchema = {
            ...inputSchema,
            properties: inputSchema.properties
              ? Object.entries(inputSchema.properties).reduce(
                (acc, [key, value]) => {
                  if (key !== name) {
                    acc[key] = value
                  }

                  return acc
                },
                {} as Record<string, JSONSchema>,
              )
              : undefined,
            required: inputSchema.required?.filter(v => v !== name),
            examples: inputSchema.examples?.map((example) => {
              if (!isPlainObject(example))
                return example

              return Object.entries(example).reduce(
                (acc, [key, value]) => {
                  if (key !== name) {
                    acc[key] = value
                  }

                  return acc
                },
                {} as Record<string, unknown>,
              )
            }),
          }

          return {
            name,
            in: 'path',
            required: true,
            schema: schema as any,
            example: internal.inputExample?.[name],
          }
        })
    })()

    const query: ParameterObject[] | undefined = (() => {
      if (method !== 'GET' || Object.keys(inputSchema).length === 0) {
        return undefined
      }

      if (typeof inputSchema !== 'object' || inputSchema.type !== 'object') {
        throw new Error(
          `When method is GET, input schema must be an object [${path_.join('.')}]`,
        )
      }

      return Object.entries(inputSchema.properties ?? {}).map(
        ([name, schema]) => {
          const examples = inputSchema.examples
            ?.filter((example) => {
              return isPlainObject(example) && name in example
            })
            .map((example) => {
              return example[name]
            })

          const schema_ = {
            examples: examples?.length ? examples : undefined,
            ...(schema === true
              ? {}
              : schema === false
                ? UNSUPPORTED_JSON_SCHEMA
                : schema),
          }

          return {
            name,
            in: 'query',
            style: 'deepObject',
            required: inputSchema?.required?.includes(name) ?? false,
            schema: schema_ as any,
            example: internal.inputExample?.[name],
          }
        },
      )
    })()

    const parameters = [...(params ?? []), ...(query ?? [])]

    const requestBody: RequestBodyObject | undefined = (() => {
      if (method === 'GET') {
        return undefined
      }

      const { schema, matches } = extractJSONSchema(inputSchema, isFileSchema)

      const files = matches as (JSONSchema & {
        type: 'string'
        contentMediaType: string
      })[]

      const isStillHasFileSchema
        = findDeepMatches(isFileSchema, schema).values.length > 0

      if (files.length) {
        parameters.push({
          name: 'content-disposition',
          in: 'header',
          required: schema === undefined,
          schema: {
            type: 'string',
            pattern: 'filename',
            example: 'filename="file.png"',
            description:
              'To define the file name. Required when the request body is a file.',
          },
        })
      }

      const content: Record<string, MediaTypeObject> = {}

      for (const file of files) {
        content[file.contentMediaType] = {
          schema: file as any,
        }
      }

      if (schema !== undefined) {
        content[
          isStillHasFileSchema ? 'multipart/form-data' : 'application/json'
        ] = {
          schema: schema as any,
          example: internal.inputExample,
        }
      }

      return {
        required: Boolean(internal.InputSchema?.isOptional()),
        content,
      }
    })()

    const successResponse: ResponseObject = (() => {
      const { schema, matches } = extractJSONSchema(outputSchema, isFileSchema)
      const files = matches as (JSONSchema & {
        type: 'string'
        contentMediaType: string
      })[]

      const isStillHasFileSchema
        = findDeepMatches(isFileSchema, schema).values.length > 0

      const content: Record<string, MediaTypeObject> = {}

      for (const file of files) {
        content[file.contentMediaType] = {
          schema: file as any,
        }
      }

      if (schema !== undefined) {
        content[
          isStillHasFileSchema ? 'multipart/form-data' : 'application/json'
        ] = {
          schema: schema as any,
          example: internal.outputExample,
        }
      }

      return {
        description: 'OK',
        content,
      }
    })()

    if (throwOnMissingTagDefinition && internal.tags) {
      const missingTag = internal.tags.find(tag => !rootTags.includes(tag))

      if (missingTag !== undefined) {
        throw new Error(
          `Tag "${missingTag}" is missing definition. Please define it in OpenAPI root tags object. [${path_.join('.')}]`,
        )
      }
    }

    const operation: OperationObject = {
      summary: internal.summary,
      description: internal.description,
      deprecated: internal.deprecated,
      tags: internal.tags,
      operationId: path_.join('.'),
      parameters: parameters.length ? parameters : undefined,
      requestBody,
      responses: {
        200: successResponse,
      },
    }

    builder.addPath(path, {
      [method.toLocaleLowerCase()]: operation,
    })
  })

  return preSerialize(builder.getSpec()) as OpenAPIObject
}

function isFileSchema(schema: unknown) {
  if (typeof schema !== 'object' || schema === null)
    return false
  return (
    'type' in schema
    && 'contentMediaType' in schema
    && typeof schema.type === 'string'
    && typeof schema.contentMediaType === 'string'
  )
}
