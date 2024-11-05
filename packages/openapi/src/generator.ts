import { type ContractRouter, eachContractRouterLeaf } from '@orpc/contract'
import { type Router, toContractRouter } from '@orpc/server'
import type { JSONSchema } from 'json-schema-typed/draft-2019-09'
import {
  type MediaTypeObject,
  type OpenAPIObject,
  OpenApiBuilder,
  type OperationObject,
  type ParameterObject,
  type RequestBodyObject,
  type ResponseObject,
} from 'openapi3-ts/oas31'
import { mapEntries, omit } from 'radash'
import type { JsonSchema7Type } from 'zod-to-json-schema'
import { findDeepMatches } from './object'
import { extractJSONSchema, zodToJsonSchema } from './zod-to-json-schema'

// Reference: https://spec.openapis.org/oas/v3.1.0.html#style-values
// TODO: support query as array
// TODO: support query as object
// TODO: support params as array

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
}

export function generateOpenAPI(
  opts: {
    router: ContractRouter | Router<any>
  } & Omit<OpenAPIObject, 'openapi'>,
  options?: GenerateOpenAPIOptions,
): OpenAPIObject {
  const throwOnMissingTagDefinition =
    options?.throwOnMissingTagDefinition ?? false

  const builder = new OpenApiBuilder({
    ...omit(opts, ['router']),
    openapi: '3.1.0',
  })

  const rootTags = opts.tags?.map((tag) => tag.name) ?? []
  const router = toContractRouter(opts.router)

  eachContractRouterLeaf(router, (procedure, path_) => {
    const internal = procedure.zz$cp
    const path = internal.path ?? `/.${path_.join('.')}`
    const method = internal.method ?? 'POST'

    const inputSchema = internal.InputSchema
      ? zodToJsonSchema(internal.InputSchema, { mode: 'input' })
      : {}
    const outputSchema = internal.OutputSchema
      ? zodToJsonSchema(internal.OutputSchema, { mode: 'output' })
      : {}

    const params: ParameterObject[] | undefined = (() => {
      const names = path.match(/{([^}]+)}/g)

      if (!names || !names.length) {
        return undefined
      }

      if (typeof inputSchema !== 'object' || inputSchema.type !== 'object') {
        throw new Error(
          `When path has parameters, input schema must be an object [${path_.join('.')}]`,
        )
      }

      return names
        .map((raw) => raw.slice(1, -1))
        .map((name) => {
          const schema = inputSchema.properties?.[name]
          const required = inputSchema.required?.includes(name)

          if (!schema) {
            throw new Error(
              `Parameter ${name} is missing in input schema [${path_.join('.')}]`,
            )
          }

          if (!required) {
            throw new Error(
              `Parameter ${name} must be required in input schema [${path_.join('.')}]`,
            )
          }

          return {
            name,
            in: 'path',
            required: true,
            schema: schema as any,
            example: internal.inputExample?.[name],
            examples: internal.inputExamples
              ? mapEntries(
                  internal.inputExamples as Record<string, Record<string, any>>,
                  (key, example) => {
                    return [key, example[name]]
                  },
                )
              : undefined,
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

      return Object.entries(inputSchema.properties ?? {})
        .filter(([name]) => !params?.find((param) => param.name === name))
        .map(([name, schema]) => {
          return {
            name,
            in: 'query',
            style: 'deepObject',
            required: true,
            schema: schema as any,
            example: internal.inputExample?.[name],
            examples: internal.inputExamples
              ? mapEntries(
                  internal.inputExamples as Record<string, Record<string, any>>,
                  (key, example) => {
                    return [key, example[name]]
                  },
                )
              : undefined,
          }
        })
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

      const isStillHasFileSchema =
        findDeepMatches(isFileSchema, schema).values.length > 0

      if (files.length) {
        parameters.push({
          name: 'content-disposition',
          in: 'header',
          required: schema === undefined,
          schema: {
            type: 'string',
            pattern: '^.*filename.*$',
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
          example: internal.inputExample,
          examples: internal.inputExamples,
        }
      }

      if (schema !== undefined) {
        content[
          isStillHasFileSchema ? 'multipart/form-data' : 'application/json'
        ] = {
          schema: schema as any,
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

      const isStillHasFileSchema =
        findDeepMatches(isFileSchema, schema).values.length > 0

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
          examples: internal.outputExamples,
        }
      }

      return {
        description: 'OK',
        content,
      }
    })()

    if (throwOnMissingTagDefinition && internal.tags) {
      const missingTag = internal.tags.find((tag) => !rootTags.includes(tag))

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
        '200': successResponse,
      },
    }

    builder.addPath(path, {
      [method.toLocaleLowerCase()]: operation,
    })
  })

  return builder.getSpec()
}

function hasFileUpload(schema: JsonSchema7Type): boolean {
  if ('properties' in schema) {
    for (const key in schema.properties) {
      const property = schema.properties[key]!

      if (hasFileUpload(property)) {
        return true
      }
    }
  }

  if (
    'patternProperties' in schema &&
    typeof schema.patternProperties === 'object'
  ) {
    for (const key in schema.patternProperties) {
      const property = (schema.patternProperties as any)[key]!

      if (hasFileUpload(property)) {
        return true
      }
    }
  }

  if (
    'additionalProperties' in schema &&
    typeof schema.additionalProperties === 'object'
  ) {
    if (hasFileUpload(schema.additionalProperties)) {
      return true
    }
  }

  if (
    'items' in schema &&
    typeof schema.items === 'object' &&
    !Array.isArray(schema.items)
  ) {
    if (hasFileUpload(schema.items)) {
      return true
    }
  }

  if ('items' in schema && Array.isArray(schema.items)) {
    for (const item of schema.items) {
      if (hasFileUpload(item)) {
        return true
      }
    }
  }

  if ('prefixItems' in schema && Array.isArray(schema.prefixItems)) {
    const prefixItems = schema.prefixItems as JsonSchema7Type[] // TODO: support tuple

    for (const item of prefixItems) {
      if (hasFileUpload(item)) {
        return true
      }
    }
  }

  if ('allOf' in schema && Array.isArray(schema.allOf)) {
    for (const item of schema.allOf) {
      if (!('type' in item)) continue

      if (hasFileUpload(item)) {
        return true
      }
    }
  }

  if ('anyOf' in schema && Array.isArray(schema.anyOf)) {
    for (const item of schema.anyOf) {
      if (!('type' in item)) continue

      if (hasFileUpload(item)) {
        return true
      }
    }
  }

  if ('oneOf' in schema && Array.isArray(schema.oneOf)) {
    for (const item of schema.oneOf) {
      if (!('type' in item)) continue

      if (hasFileUpload(item)) {
        return true
      }
    }
  }

  if (
    'contentMediaType' in schema &&
    typeof schema.contentMediaType === 'string' &&
    'type' in schema &&
    schema.type === 'string'
  ) {
    return true
  }

  return false
}

function separateRootFiles(
  schema: JsonSchema7Type,
  files: (JsonSchema7Type & {
    type: 'string'
    contentMediaType: string
  })[] = [],
): {
  schema: JsonSchema7Type | undefined
  files: (JsonSchema7Type & { type: 'string'; contentMediaType: string })[]
} {
  if ('anyOf' in schema && Array.isArray(schema.anyOf)) {
    const anyOf = schema.anyOf
      .map((item) => {
        if (!('type' in item)) return item

        return separateRootFiles(item, files).schema
      })
      .filter(Boolean)
    const newSchema = {
      ...schema,
      anyOf: anyOf.length ? anyOf : undefined,
    }

    return { schema: newSchema, files }
  }

  if ('oneOf' in schema && Array.isArray(schema.oneOf)) {
    const oneOf = schema.oneOf
      .map((item) => {
        if (!('type' in item)) return item

        return separateRootFiles(item, files).schema
      })
      .filter(Boolean)

    const newSchema = {
      ...schema,
      oneOf: oneOf.length ? oneOf : undefined,
    }

    return { schema: newSchema, files }
  }

  if (
    'contentMediaType' in schema &&
    typeof schema.contentMediaType === 'string' &&
    'type' in schema &&
    schema.type === 'string'
  ) {
    files.push(schema as any)
    return { schema: undefined, files }
  }

  return { schema, files }
}

function isFileSchema(schema: unknown) {
  if (typeof schema !== 'object' || schema === null) return false
  return (
    'type' in schema &&
    'contentMediaType' in schema &&
    typeof schema.type === 'string' &&
    typeof schema.contentMediaType === 'string'
  )
}
