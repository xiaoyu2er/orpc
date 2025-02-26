import type { PublicOpenAPIInputStructureParser } from './openapi-input-structure-parser'
import type { PublicOpenAPIOutputStructureParser } from './openapi-output-structure-parser'
import type { PublicOpenAPIPathParser } from './openapi-path-parser'
import type { JSONSchema } from './schema'
import type { SchemaConverter } from './schema-converter'
import { fallbackORPCErrorStatus } from '@orpc/client'
import { OpenAPIJsonSerializer } from '@orpc/client/openapi'
import { type ContractRouter, fallbackContractConfig, getEventIteratorSchemaDetails } from '@orpc/contract'
import { type AnyRouter, eachAllContractProcedure } from '@orpc/server'
import { group } from '@orpc/shared'
import { type OpenAPI, OpenApiBuilder } from './openapi'
import { OpenAPIContentBuilder, type PublicOpenAPIContentBuilder } from './openapi-content-builder'
import { OpenAPIError } from './openapi-error'
import { OpenAPIInputStructureParser } from './openapi-input-structure-parser'
import { extendOperation } from './openapi-operation-extender'
import { OpenAPIOutputStructureParser } from './openapi-output-structure-parser'
import { OpenAPIParametersBuilder, type PublicOpenAPIParametersBuilder } from './openapi-parameters-builder'
import { OpenAPIPathParser } from './openapi-path-parser'
import { CompositeSchemaConverter } from './schema-converter'
import { type PublicSchemaUtils, SchemaUtils } from './schema-utils'
import { toOpenAPI31RoutePattern } from './utils'

type ErrorHandlerStrategy = 'throw' | 'log' | 'ignore'

export interface OpenAPIGeneratorOptions {
  contentBuilder?: PublicOpenAPIContentBuilder
  parametersBuilder?: PublicOpenAPIParametersBuilder
  schemaConverters?: SchemaConverter[]
  schemaUtils?: PublicSchemaUtils
  jsonSerializer?: OpenAPIJsonSerializer
  pathParser?: PublicOpenAPIPathParser
  inputStructureParser?: PublicOpenAPIInputStructureParser
  outputStructureParser?: PublicOpenAPIOutputStructureParser

  /**
   * Throw error when you missing define tag definition on OpenAPI root tags
   *
   * Example: if procedure has tags ['foo', 'bar'], and OpenAPI root tags is ['foo'], then error will be thrown
   * Because OpenAPI root tags is missing 'bar' tag
   *
   * @default false
   */
  considerMissingTagDefinitionAsError?: boolean

  /**
   * Weather ignore procedures that has no path defined.
   *
   * @default false
   */
  ignoreUndefinedPathProcedures?: boolean

  /**
   * What to do when we found an error with our router
   *
   * @default 'throw'
   */
  errorHandlerStrategy?: ErrorHandlerStrategy

  /**
   * Strict error response
   *
   * @default true
   */
  strictErrorResponses?: boolean
}

export class OpenAPIGenerator {
  private readonly contentBuilder: PublicOpenAPIContentBuilder
  private readonly parametersBuilder: PublicOpenAPIParametersBuilder
  private readonly schemaConverter: CompositeSchemaConverter
  private readonly schemaUtils: PublicSchemaUtils
  private readonly jsonSerializer: OpenAPIJsonSerializer
  private readonly pathParser: PublicOpenAPIPathParser
  private readonly inputStructureParser: PublicOpenAPIInputStructureParser
  private readonly outputStructureParser: PublicOpenAPIOutputStructureParser
  private readonly errorHandlerStrategy: ErrorHandlerStrategy
  private readonly ignoreUndefinedPathProcedures: boolean
  private readonly considerMissingTagDefinitionAsError: boolean
  private readonly strictErrorResponses: boolean

  constructor(options?: OpenAPIGeneratorOptions) {
    this.parametersBuilder = options?.parametersBuilder ?? new OpenAPIParametersBuilder()
    this.schemaConverter = new CompositeSchemaConverter(options?.schemaConverters ?? [])
    this.schemaUtils = options?.schemaUtils ?? new SchemaUtils()
    this.jsonSerializer = options?.jsonSerializer ?? new OpenAPIJsonSerializer()
    this.contentBuilder = options?.contentBuilder ?? new OpenAPIContentBuilder(this.schemaUtils)
    this.pathParser = new OpenAPIPathParser()

    this.inputStructureParser = options?.inputStructureParser ?? new OpenAPIInputStructureParser(this.schemaConverter, this.schemaUtils, this.pathParser)
    this.outputStructureParser = options?.outputStructureParser ?? new OpenAPIOutputStructureParser(this.schemaConverter, this.schemaUtils)

    this.errorHandlerStrategy = options?.errorHandlerStrategy ?? 'throw'
    this.ignoreUndefinedPathProcedures = options?.ignoreUndefinedPathProcedures ?? false
    this.considerMissingTagDefinitionAsError = options?.considerMissingTagDefinitionAsError ?? false
    this.strictErrorResponses = options?.strictErrorResponses ?? true
  }

  async generate(router: ContractRouter<any> | AnyRouter, doc: Omit<OpenAPI.OpenAPIObject, 'openapi'>): Promise<OpenAPI.OpenAPIObject> {
    const builder = new OpenApiBuilder({
      ...doc,
      openapi: '3.1.1',
    })

    const rootTags = doc.tags?.map(tag => tag.name) ?? []

    await eachAllContractProcedure({
      path: [],
      router,
    }, ({ contract, path }) => {
      try {
        // TODO: inputExample and outputExample ???
        const def = contract['~orpc']

        if (this.ignoreUndefinedPathProcedures && def.route?.path === undefined) {
          return
        }

        const method = fallbackContractConfig('defaultMethod', def.route?.method)
        const httpPath = def.route?.path ? toOpenAPI31RoutePattern(def.route?.path) : `/${path.map(encodeURIComponent).join('/')}`

        const { parameters, requestBody } = (() => {
          const eventIteratorSchemaDetails = getEventIteratorSchemaDetails(def.inputSchema)

          if (eventIteratorSchemaDetails) {
            const requestBody: OpenAPI.RequestBodyObject = {
              required: true,
              content: {
                'text/event-stream': {
                  schema: {
                    oneOf: [
                      {
                        type: 'object',
                        properties: {
                          event: { type: 'string', const: 'message' },
                          data: this.schemaConverter.convert(eventIteratorSchemaDetails.yields, { strategy: 'input' }) as any,
                          id: { type: 'string' },
                          retry: { type: 'number' },
                        },
                        required: ['event', 'data'],
                      },
                      {
                        type: 'object',
                        properties: {
                          event: { type: 'string', const: 'done' },
                          data: this.schemaConverter.convert(eventIteratorSchemaDetails.returns, { strategy: 'input' }) as any,
                          id: { type: 'string' },
                          retry: { type: 'number' },
                        },
                        required: ['event', 'data'],
                      },
                      {
                        type: 'object',
                        properties: {
                          event: { type: 'string', const: 'error' },
                          data: {},
                          id: { type: 'string' },
                          retry: { type: 'number' },
                        },
                        required: ['event', 'data'],
                      },
                    ],
                  },
                },
              },
            }

            return { requestBody, parameters: [] }
          }

          const inputStructure = fallbackContractConfig('defaultInputStructure', def.route?.inputStructure)

          const { paramsSchema, querySchema, headersSchema, bodySchema } = this.inputStructureParser.parse(contract, inputStructure)

          const params = paramsSchema
            ? this.parametersBuilder.build('path', paramsSchema, {
                required: true,
              })
            : []

          const query = querySchema
            ? this.parametersBuilder.build('query', querySchema)
            : []

          const headers = headersSchema
            ? this.parametersBuilder.build('header', headersSchema)
            : []

          const parameters = [...params, ...query, ...headers]

          const requestBody = bodySchema !== undefined
            ? {
                required: this.schemaUtils.isUndefinableSchema(bodySchema),
                content: this.contentBuilder.build(bodySchema),
              }
            : undefined

          return { parameters, requestBody }
        })()

        const { responses } = (() => {
          const eventIteratorSchemaDetails = getEventIteratorSchemaDetails(def.outputSchema)

          if (eventIteratorSchemaDetails) {
            const responses: OpenAPI.ResponsesObject = {}

            responses[fallbackContractConfig('defaultSuccessStatus', def.route?.successStatus)] = {
              description: fallbackContractConfig('defaultSuccessDescription', def.route?.successDescription),
              content: {
                'text/event-stream': {
                  schema: {
                    oneOf: [
                      {
                        type: 'object',
                        properties: {
                          event: { type: 'string', const: 'message' },
                          data: this.schemaConverter.convert(eventIteratorSchemaDetails.yields, { strategy: 'input' }) as any,
                          id: { type: 'string' },
                          retry: { type: 'number' },
                        },
                        required: ['event', 'data'],
                      },
                      {
                        type: 'object',
                        properties: {
                          event: { type: 'string', const: 'done' },
                          data: this.schemaConverter.convert(eventIteratorSchemaDetails.returns, { strategy: 'input' }) as any,
                          id: { type: 'string' },
                          retry: { type: 'number' },
                        },
                        required: ['event', 'data'],
                      },
                      {
                        type: 'object',
                        properties: {
                          event: { type: 'string', const: 'error' },
                          data: {},
                          id: { type: 'string' },
                          retry: { type: 'number' },
                        },
                        required: ['event', 'data'],
                      },
                    ],
                  },
                },
              },
            }

            return { responses }
          }

          const outputStructure = fallbackContractConfig('defaultOutputStructure', def.route?.outputStructure)
          const { headersSchema: resHeadersSchema, bodySchema: resBodySchema } = this.outputStructureParser.parse(contract, outputStructure)

          const responses: OpenAPI.ResponsesObject = {}

          responses[fallbackContractConfig('defaultSuccessStatus', def.route?.successStatus)] = {
            description: fallbackContractConfig('defaultSuccessDescription', def.route?.successDescription),
            content: resBodySchema !== undefined
              ? this.contentBuilder.build(resBodySchema)
              : undefined,
            headers: resHeadersSchema !== undefined
              ? this.parametersBuilder.buildHeadersObject(resHeadersSchema)
              : undefined,
          }

          return { responses }
        })()

        const errors = group(Object.entries(def.errorMap ?? {})
          .filter(([_, config]) => config)
          .map(([code, config]: any) => ({
            ...config,
            code,
            status: fallbackORPCErrorStatus(code, config?.status),
          })), error => error.status)

        for (const status in errors) {
          const configs = errors[status]

          if (!configs || configs.length === 0) {
            continue
          }

          const schemas: JSONSchema.JSONSchema[] = configs
            .map(({ data, code, message }) => {
              const json = {
                type: 'object',
                properties: {
                  defined: { const: true },
                  code: { const: code },
                  status: { const: Number(status) },
                  message: { type: 'string', default: message },
                  data: {},
                },
                required: ['defined', 'code', 'status', 'message'],
              } satisfies JSONSchema.JSONSchema

              if (data) {
                const dataJson = this.schemaConverter.convert(data, { strategy: 'output' })

                json.properties.data = dataJson

                if (!this.schemaUtils.isUndefinableSchema(dataJson)) {
                  json.required.push('data')
                }
              }

              return json
            })

          if (this.strictErrorResponses) {
            schemas.push({
              type: 'object',
              properties: {
                defined: { const: false },
                code: { type: 'string' },
                status: { type: 'number' },
                message: { type: 'string' },
                data: {},
              },
              required: ['defined', 'code', 'status', 'message'],
            })
          }

          const contentSchema = schemas.length === 1
            ? schemas[0]!
            : {
                oneOf: schemas,
              }

          responses[status] = {
            description: status,
            content: this.contentBuilder.build(contentSchema),
          }
        }

        if (this.considerMissingTagDefinitionAsError && def.route?.tags) {
          const missingTag = def.route?.tags.find(tag => !rootTags.includes(tag))

          if (missingTag !== undefined) {
            throw new OpenAPIError(
              `Tag "${missingTag}" is missing definition. Please define it in OpenAPI root tags object`,
            )
          }
        }

        const operation: OpenAPI.OperationObject = {
          summary: def.route?.summary,
          description: def.route?.description,
          deprecated: def.route?.deprecated,
          tags: def.route?.tags ? [...def.route.tags] : undefined,
          operationId: path.join('.'),
          parameters: parameters.length ? parameters : undefined,
          requestBody,
          responses,
        }

        const extendedOperation = extendOperation(operation, contract)

        builder.addPath(httpPath, {
          [method.toLocaleLowerCase()]: extendedOperation,
        })
      }
      catch (e) {
        if (e instanceof OpenAPIError) {
          const error = new OpenAPIError(`
            Generate OpenAPI Error: ${e.message}
            Happened at path: ${path.join('.')}
          `, { cause: e })

          if (this.errorHandlerStrategy === 'throw') {
            throw error
          }

          if (this.errorHandlerStrategy === 'log') {
            console.error(error)
          }
        }
        else {
          throw e
        }
      }
    })

    return this.jsonSerializer.serialize(builder.getSpec())[0] as OpenAPI.OpenAPIObject
  }
}
