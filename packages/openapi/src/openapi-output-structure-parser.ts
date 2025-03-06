import type { AnyContractProcedure } from '@orpc/contract'
import type { JSONSchema, ObjectSchema } from './schema'
import type { SchemaConverter } from './schema-converter'
import type { PublicSchemaUtils } from './schema-utils'
import { OpenAPIError } from './openapi-error'

export interface OpenAPIOutputStructureParseResult {
  headersSchema: ObjectSchema | undefined
  bodySchema: JSONSchema | undefined
}

export class OpenAPIOutputStructureParser {
  constructor(
    private readonly schemaConverter: SchemaConverter,
    private readonly schemaUtils: PublicSchemaUtils,
  ) { }

  parse(contract: AnyContractProcedure, structure: 'compact' | 'detailed'): OpenAPIOutputStructureParseResult {
    const [_, outputSchema] = this.schemaConverter.convert(contract['~orpc'].outputSchema, 'output')

    // TODO: refactor and remove this logic
    if (this.schemaUtils.isAnySchema(outputSchema)) {
      return {
        headersSchema: undefined,
        bodySchema: undefined,
      }
    }

    if (structure === 'detailed') {
      return this.parseDetailedSchema(outputSchema)
    }
    else {
      return this.parseCompactSchema(outputSchema)
    }
  }

  private parseDetailedSchema(outputSchema: JSONSchema): OpenAPIOutputStructureParseResult {
    if (!this.schemaUtils.isObjectSchema(outputSchema)) {
      throw new OpenAPIError(`When output structure is 'detailed', output schema must be an object.`)
    }

    if (outputSchema.properties && Object.keys(outputSchema.properties).some(key => !['headers', 'body'].includes(key))) {
      throw new OpenAPIError(`When output structure is 'detailed', output schema must be only can contain 'headers' and 'body' properties.`)
    }

    let headersSchema = outputSchema.properties?.headers
    const bodySchema = outputSchema.properties?.body

    if (headersSchema !== undefined && this.schemaUtils.isAnySchema(headersSchema)) {
      headersSchema = undefined
    }

    if (headersSchema !== undefined && !this.schemaUtils.isObjectSchema(headersSchema)) {
      throw new OpenAPIError(`When output structure is 'detailed', headers schema in output schema must be an object.`)
    }

    return { headersSchema, bodySchema }
  }

  private parseCompactSchema(outputSchema: JSONSchema): OpenAPIOutputStructureParseResult {
    return {
      headersSchema: undefined,
      bodySchema: outputSchema,
    }
  }
}

export type PublicOpenAPIOutputStructureParser = Pick<OpenAPIOutputStructureParser, keyof OpenAPIOutputStructureParser>
