import type { ANY_ROUTER } from '@orpc/server'
import type { PublicOpenAPIInputStructureParser } from './openapi-input-structure-parser'
import type { PublicOpenAPIOutputStructureParser } from './openapi-output-structure-parser'
import type { PublicOpenAPIPathParser } from './openapi-path-parser'
import type { SchemaConverter } from './schema-converter'
import { type ContractRouter, fallbackToGlobalConfig } from '@orpc/contract'
import { JSONSerializer, type PublicJSONSerializer } from './json-serializer'
import { type OpenAPI, OpenApiBuilder } from './openapi'
import { OpenAPIContentBuilder, type PublicOpenAPIContentBuilder } from './openapi-content-builder'
import { OpenAPIError } from './openapi-error'
import { OpenAPIInputStructureParser } from './openapi-input-structure-parser'
import { OpenAPIOutputStructureParser } from './openapi-output-structure-parser'
import { OpenAPIParametersBuilder, type PublicOpenAPIParametersBuilder } from './openapi-parameters-builder'
import { OpenAPIPathParser } from './openapi-path-parser'
import { CompositeSchemaConverter } from './schema-converter'
import { type PublicSchemaUtils, SchemaUtils } from './schema-utils'
import { forEachAllContractProcedure, standardizeHTTPPath } from './utils'

type ErrorHandlerStrategy = 'throw' | 'log' | 'ignore'

export interface OpenAPIGeneratorOptions {
  contentBuilder?: PublicOpenAPIContentBuilder
  parametersBuilder?: PublicOpenAPIParametersBuilder
  schemaConverters?: SchemaConverter[]
  schemaUtils?: PublicSchemaUtils
  jsonSerializer?: PublicJSONSerializer
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
}

export class OpenAPIGenerator {
  private readonly contentBuilder: PublicOpenAPIContentBuilder
  private readonly parametersBuilder: PublicOpenAPIParametersBuilder
  private readonly schemaConverter: CompositeSchemaConverter
  private readonly schemaUtils: PublicSchemaUtils
  private readonly jsonSerializer: PublicJSONSerializer
  private readonly pathParser: PublicOpenAPIPathParser
  private readonly inputStructureParser: PublicOpenAPIInputStructureParser
  private readonly outputStructureParser: PublicOpenAPIOutputStructureParser
  private readonly errorHandlerStrategy: ErrorHandlerStrategy
  private readonly ignoreUndefinedPathProcedures: boolean
  private readonly considerMissingTagDefinitionAsError: boolean

  constructor(options?: OpenAPIGeneratorOptions) {
    this.parametersBuilder = options?.parametersBuilder ?? new OpenAPIParametersBuilder()
    this.schemaConverter = new CompositeSchemaConverter(options?.schemaConverters ?? [])
    this.schemaUtils = options?.schemaUtils ?? new SchemaUtils()
    this.jsonSerializer = options?.jsonSerializer ?? new JSONSerializer()
    this.contentBuilder = options?.contentBuilder ?? new OpenAPIContentBuilder(this.schemaUtils)
    this.pathParser = new OpenAPIPathParser()

    this.inputStructureParser = options?.inputStructureParser ?? new OpenAPIInputStructureParser(this.schemaConverter, this.schemaUtils, this.pathParser)
    this.outputStructureParser = options?.outputStructureParser ?? new OpenAPIOutputStructureParser(this.schemaConverter, this.schemaUtils)

    this.errorHandlerStrategy = options?.errorHandlerStrategy ?? 'throw'
    this.ignoreUndefinedPathProcedures = options?.ignoreUndefinedPathProcedures ?? false
    this.considerMissingTagDefinitionAsError = options?.considerMissingTagDefinitionAsError ?? false
  }

  async generate(router: ContractRouter | ANY_ROUTER, doc: Omit<OpenAPI.OpenAPIObject, 'openapi'>): Promise<OpenAPI.OpenAPIObject> {
    const builder = new OpenApiBuilder({
      ...doc,
      openapi: '3.1.1',
    })

    const rootTags = doc.tags?.map(tag => tag.name) ?? []

    await forEachAllContractProcedure(router, ({ contract, path }) => {
      try {
        // TODO: inputExample and outputExample ???
        const def = contract['~orpc']

        if (this.ignoreUndefinedPathProcedures && def.route?.path === undefined) {
          return
        }

        const method = fallbackToGlobalConfig('defaultMethod', def.route?.method)
        const httpPath = def.route?.path ? standardizeHTTPPath(def.route?.path) : `/${path.map(encodeURIComponent).join('/')}`
        const inputStructure = fallbackToGlobalConfig('defaultInputStructure', def.route?.inputStructure)
        const outputStructure = fallbackToGlobalConfig('defaultOutputStructure', def.route?.outputStructure)

        const { paramsSchema, querySchema, headersSchema, bodySchema } = this.inputStructureParser.parse(contract, inputStructure)
        const { headersSchema: resHeadersSchema, bodySchema: resBodySchema } = this.outputStructureParser.parse(contract, outputStructure)

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

        const successResponse: OpenAPI.ResponseObject = {
          description: 'OK',
          content: resBodySchema !== undefined
            ? this.contentBuilder.build(resBodySchema, {
                example: def.outputExample,
              })
            : undefined,
          headers: resHeadersSchema !== undefined
            ? this.parametersBuilder.buildHeadersObject(resHeadersSchema, {
                example: def.outputExample,
              })
            : undefined,
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
          responses: {
            [fallbackToGlobalConfig('defaultSuccessStatus', def.route?.successStatus)]: successResponse,
          },
        }

        builder.addPath(httpPath, {
          [method.toLocaleLowerCase()]: operation,
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

    return this.jsonSerializer.serialize(builder.getSpec()) as OpenAPI.OpenAPIObject
  }
}
