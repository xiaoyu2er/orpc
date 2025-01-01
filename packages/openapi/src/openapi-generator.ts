import type { ContractRouter } from '@orpc/contract'
import type { ANY_ROUTER } from '@orpc/server'
import type { PublicOpenAPIInputStructureParser } from './openapi-input-structure-parser'
import type { PublicOpenAPIOutputStructureParser } from './openapi-output-structure-parser'
import type { PublicOpenAPIPathParser } from './openapi-path-parser'
import type { SchemaConverter } from './schema-converter'
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

export interface OpenAPIGeneratorOptions {
  contentBuilder?: PublicOpenAPIContentBuilder
  parametersBuilder?: PublicOpenAPIParametersBuilder
  schemaConverters?: SchemaConverter[]
  schemaUtils?: PublicSchemaUtils
  jsonSerializer?: PublicJSONSerializer
  pathParser?: PublicOpenAPIPathParser
  inputStructureParser: PublicOpenAPIInputStructureParser
  outputStructureParser: PublicOpenAPIOutputStructureParser

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
   * Throw error when you have error in OpenAPI generator
   *
   * @default false
   */
  throwOnError?: boolean
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

  constructor(private readonly options?: OpenAPIGeneratorOptions) {
    this.parametersBuilder = options?.parametersBuilder ?? new OpenAPIParametersBuilder()
    this.schemaConverter = new CompositeSchemaConverter(options?.schemaConverters ?? [])
    this.schemaUtils = options?.schemaUtils ?? new SchemaUtils()
    this.jsonSerializer = options?.jsonSerializer ?? new JSONSerializer()
    this.contentBuilder = options?.contentBuilder ?? new OpenAPIContentBuilder(this.schemaUtils)
    this.pathParser = new OpenAPIPathParser()

    this.inputStructureParser = options?.inputStructureParser ?? new OpenAPIInputStructureParser(this.schemaConverter, this.schemaUtils, this.pathParser)
    this.outputStructureParser = options?.outputStructureParser ?? new OpenAPIOutputStructureParser(this.schemaConverter, this.schemaUtils)
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

        if (this.options?.ignoreUndefinedPathProcedures && def.route?.path === undefined) {
          return
        }

        const method = def.route?.method ?? 'POST'
        const httpPath = def.route?.path ? standardizeHTTPPath(def.route?.path) : `/${path.map(encodeURIComponent).join('/')}`

        const { paramsSchema, querySchema, headersSchema, bodySchema } = this.inputStructureParser.parse(contract, def.route?.inputStructure ?? 'compact')
        const { headersSchema: resHeadersSchema, bodySchema: resBodySchema } = this.outputStructureParser.parse(contract, def.route?.outputStructure ?? 'compact')

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

        if (this.options?.considerMissingTagDefinitionAsError && def.route?.tags) {
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
            [def.route?.successStatus ?? 200]: successResponse,
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

          if (this.options?.throwOnError) {
            throw error
          }

          console.error(error)
        }
      }
    })

    return this.jsonSerializer.serialize(builder.getSpec()) as OpenAPI.OpenAPIObject
  }
}
