import type { AnyContractProcedure } from '@orpc/contract'
import type { PublicOpenAPIPathParser } from './openapi-path-parser'
import type { JSONSchema, ObjectSchema } from './schema'
import type { SchemaConverter } from './schema-converter'
import type { PublicSchemaUtils } from './schema-utils'
import { fallbackContractConfig } from '@orpc/contract'
import { OpenAPIError } from './openapi-error'

export interface OpenAPIInputStructureParseResult {
  paramsSchema: ObjectSchema | undefined
  querySchema: ObjectSchema | undefined
  headersSchema: ObjectSchema | undefined
  bodySchema: JSONSchema | undefined
}

export class OpenAPIInputStructureParser {
  constructor(
    private readonly schemaConverter: SchemaConverter,
    private readonly schemaUtils: PublicSchemaUtils,
    private readonly pathParser: PublicOpenAPIPathParser,
  ) { }

  parse(contract: AnyContractProcedure, structure: 'compact' | 'detailed'): OpenAPIInputStructureParseResult {
    const [_, inputSchema] = this.schemaConverter.convert(contract['~orpc'].inputSchema, 'input')
    const method = fallbackContractConfig('defaultMethod', contract['~orpc'].route?.method)
    const httpPath = contract['~orpc'].route?.path

    if (this.schemaUtils.isAnySchema(inputSchema)) {
      return {
        paramsSchema: undefined,
        querySchema: undefined,
        headersSchema: undefined,
        bodySchema: undefined,
      }
    }

    if (structure === 'detailed') {
      return this.parseDetailedSchema(inputSchema)
    }
    else {
      return this.parseCompactSchema(inputSchema, method, httpPath)
    }
  }

  private parseDetailedSchema(inputSchema: JSONSchema): OpenAPIInputStructureParseResult {
    if (!this.schemaUtils.isObjectSchema(inputSchema)) {
      throw new OpenAPIError(`When input structure is 'detailed', input schema must be an object.`)
    }

    if (inputSchema.properties && Object.keys(inputSchema.properties).some(key => !['params', 'query', 'headers', 'body'].includes(key))) {
      throw new OpenAPIError(`When input structure is 'detailed', input schema must be only can contain 'params', 'query', 'headers' and 'body' properties.`)
    }

    let paramsSchema = inputSchema.properties?.params
    let querySchema = inputSchema.properties?.query
    let headersSchema = inputSchema.properties?.headers
    const bodySchema = inputSchema.properties?.body

    if (paramsSchema !== undefined && this.schemaUtils.isAnySchema(paramsSchema)) {
      paramsSchema = undefined
    }

    if (paramsSchema !== undefined && !this.schemaUtils.isObjectSchema(paramsSchema)) {
      throw new OpenAPIError(`When input structure is 'detailed', params schema in input schema must be an object.`)
    }

    if (querySchema !== undefined && this.schemaUtils.isAnySchema(querySchema)) {
      querySchema = undefined
    }

    if (querySchema !== undefined && !this.schemaUtils.isObjectSchema(querySchema)) {
      throw new OpenAPIError(`When input structure is 'detailed', query schema in input schema must be an object.`)
    }

    if (headersSchema !== undefined && this.schemaUtils.isAnySchema(headersSchema)) {
      headersSchema = undefined
    }

    if (headersSchema !== undefined && !this.schemaUtils.isObjectSchema(headersSchema)) {
      throw new OpenAPIError(`When input structure is 'detailed', headers schema in input schema must be an object.`)
    }

    return { paramsSchema, querySchema, headersSchema, bodySchema }
  }

  private parseCompactSchema(inputSchema: JSONSchema, method: string, httpPath: string | undefined): OpenAPIInputStructureParseResult {
    const dynamic = httpPath ? this.pathParser.parseDynamicParams(httpPath) : []

    if (dynamic.length === 0) {
      if (method === 'GET') {
        let querySchema: JSONSchema | undefined = inputSchema

        if (querySchema !== undefined && this.schemaUtils.isAnySchema(querySchema)) {
          querySchema = undefined
        }

        if (querySchema !== undefined && !this.schemaUtils.isObjectSchema(querySchema)) {
          throw new OpenAPIError(`When input structure is 'compact' and method is 'GET', input schema must be an object.`)
        }

        return {
          paramsSchema: undefined,
          querySchema,
          headersSchema: undefined,
          bodySchema: undefined,
        }
      }

      return {
        paramsSchema: undefined,
        querySchema: undefined,
        headersSchema: undefined,
        bodySchema: inputSchema,
      }
    }

    if (!this.schemaUtils.isObjectSchema(inputSchema)) {
      throw new OpenAPIError(`When input structure is 'compact' and path has dynamic parameters, input schema must be an object.`)
    }

    const [params, rest] = this.schemaUtils.separateObjectSchema(inputSchema, dynamic.map(v => v.name))

    return {
      paramsSchema: params,
      querySchema: method === 'GET' ? rest : undefined,
      headersSchema: undefined,
      bodySchema: method !== 'GET' ? rest : undefined,
    }
  }
}

export type PublicOpenAPIInputStructureParser = Pick<OpenAPIInputStructureParser, keyof OpenAPIInputStructureParser>
