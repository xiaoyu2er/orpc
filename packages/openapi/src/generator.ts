import { type ContractRouter, eachContractRouterLeaf } from '@orpc/contract'
import { type Router, toContractRouter } from '@orpc/server'
import {
  type OpenAPIObject,
  OpenApiBuilder,
  type OperationObject,
  type ParameterObject,
  type RequestBodyObject,
  type ResponseObject,
} from 'openapi3-ts/oas31'
import { mapEntries, omit } from 'radash'
import { schemaToJsonSchema } from './json-schema'

// Reference: https://spec.openapis.org/oas/v3.1.0.html#style-values
// TODO: support query as array
// TODO: support query as object
// TODO: support params as array
// TODO: support multipart/form-data for file upload

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

    const inputSchema = schemaToJsonSchema(internal.InputSchema)

    const params: ParameterObject[] | undefined = (() => {
      const names = path.match(/{([^}]+)}/g)

      if (!names || !names.length) {
        return undefined
      }

      if (inputSchema.type !== 'object') {
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
            schema: schema,
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

      if (inputSchema.type !== 'object') {
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
            required: true,
            schema,
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

      return {
        required: Boolean(internal.InputSchema?.isOptional()),
        content: {
          'application/json': {
            schema: inputSchema,
            example: internal.inputExample,
            examples: internal.inputExamples,
          },
        },
      }
    })()

    const successResponse: ResponseObject = {
      description: 'OK',
      content: {
        'application/json': {
          schema: schemaToJsonSchema(internal.OutputSchema),
          example: internal.outputExample,
          examples: internal.outputExamples,
        },
      },
    }

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
