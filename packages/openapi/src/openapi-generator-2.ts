import type { AnyContractProcedure, AnyContractRouter, ErrorMap } from '@orpc/contract'
import type { OpenAPI } from './openapi'
import type { JSONSchema } from './schema'
import { fallbackORPCErrorStatus } from '@orpc/client'
import { fallbackContractConfig, getEventIteratorSchemaDetails } from '@orpc/contract'
import { OpenAPISerializer } from '@orpc/openapi-client/standard'
import { type AnyRouter, convertPathToHttpPath, eachAllContractProcedure } from '@orpc/server'
import { clone } from '@orpc/shared'
import { getDynamicParams, toOpenAPIContent, toOpenAPIEventIteratorContent, toOpenAPIMethod, toOpenAPIPath } from './openapi-utils'
import { CompositeSchemaConverter, type ConditionalSchemaConverter, type SchemaConverter } from './schema-converter'
import { isObjectSchema, separateObjectSchema } from './schema-utils'

class OpenAPIGeneratorError extends Error {}

export interface OpenAPIGeneratorOptions {
  schemaConverters?: ConditionalSchemaConverter[]
}

export class OpenAPIGenerator {
  private readonly serializer: OpenAPISerializer
  private readonly converter: SchemaConverter

  constructor(options: OpenAPIGeneratorOptions = {}) {
    this.serializer = new OpenAPISerializer()
    this.converter = new CompositeSchemaConverter(options.schemaConverters ?? [])
  }

  async generate(router: AnyContractRouter | AnyRouter, base: Omit<OpenAPI.Document, 'openapi'> = {}): Promise<OpenAPI.Document> {
    const doc: OpenAPI.Document = clone(base)

    doc.openapi = '3.1.1'

    let hasGenerationErrors = false

    await eachAllContractProcedure({ path: [], router }, ({ contract, path }) => {
      try {
        const def = contract['~orpc']

        const method = toOpenAPIMethod(fallbackContractConfig('defaultMethod', def.route.method))
        const httpPath = toOpenAPIPath(def.route.path ?? convertPathToHttpPath(path))

        const operationObjectRef: OpenAPI.OperationObject = {
          summary: def.route.summary,
          description: def.route.description,
          deprecated: def.route.deprecated,
          tags: def.route.tags,
        }

        this.#request(operationObjectRef, def)
        this.#successResponse(operationObjectRef, def)
        this.#errorResponse(operationObjectRef, def)

        doc.paths ??= {}
        doc.paths[httpPath] ??= {}
        doc.paths[httpPath][method] = operationObjectRef
      }
      catch (e) {
        if (!(e instanceof OpenAPIGeneratorError)) {
          throw e
        }

        hasGenerationErrors = true

        console.error(
          `[OpenAPIGenerator] Error occurred while generating OpenAPI for procedure at path: ${path.join('.')}\n${e.message}`,
        )
      }
    })

    if (hasGenerationErrors) {
      throw new OpenAPIGeneratorError('Some error occurred during OpenAPI generation, please check the console for more details')
    }

    return this.serializer.serialize(doc) as OpenAPI.Document
  }

  #request(ref: OpenAPI.OperationObject, def: AnyContractProcedure['~orpc']): void {
    const details = getEventIteratorSchemaDetails(def.inputSchema)

    if (details) {
      ref.requestBody = {
        required: true,
        content: toOpenAPIEventIteratorContent(
          this.converter.convert(details.yields, 'input'),
          this.converter.convert(details.returns, 'input'),
        ),
      }

      return
    }

    const dynamicParams = getDynamicParams(def.route.path)
    const inputStructure = fallbackContractConfig('defaultInputStructure', def.route.inputStructure)
    const [required, schema] = this.converter.convert(def.inputSchema, 'input')

    if (inputStructure === 'compact') {
      if (dynamicParams?.length) {
        const error = new OpenAPIGeneratorError(
          'When input structure is "compact" and path has dynamic params, input schema must be an object with all dynamic params as required.',
        )

        if (!isObjectSchema(schema)) {
          throw error
        }

        const [params, body] = separateObjectSchema(schema, dynamicParams)

        if (!params.properties || Object.keys(params.properties).length !== dynamicParams.length) {
          throw error
        }

        if (params.required?.length !== dynamicParams.length) {
          throw error
        }

        ref.parameters ??= []

        for (const key in params.properties) {
          ref.parameters.push({
            name: key,
            in: 'query',
            required: params.required?.includes(key),
            schema: params.properties[key],
          })
        }

        ref.requestBody = {
          required: body.required ? body.required.length !== 0 : false,
          content: toOpenAPIContent(body),
        }
      }
      else {
        ref.requestBody = {
          required,
          content: toOpenAPIContent(schema),
        }
      }

      return
    }

    const error = new OpenAPIGeneratorError(
      'When input structure is "detailed", input schema must satisfy: '
      + '{ params?: Record<string, unknown>, query?: Record<string, unknown>, headers?: Record<string, unknown>, body?: unknown }',
    )

    if (!isObjectSchema(schema)) {
      throw error
    }

    if (dynamicParams?.length) {
      const error = new OpenAPIGeneratorError(
        'When input structure is "detailed" and path has dynamic params, the "params" schema must be an object with all dynamic params as required.',
      )

      if (schema.properties?.params === undefined || !isObjectSchema(schema.properties.params)) {
        throw error
      }

      if (!schema.properties.params.properties || Object.keys(schema.properties.params.properties).length !== dynamicParams.length) {
        throw error
      }

      if (schema.properties.params.required?.length !== dynamicParams.length) {
        throw error
      }
    }

    for (const from of ['params', 'query', 'headers']) {
      const fromSchema = schema.properties?.[from]
      if (fromSchema !== undefined) {
        if (!isObjectSchema(fromSchema)) {
          throw error
        }

        for (const key in fromSchema.properties) {
          ref.parameters ??= []
          ref.parameters.push({
            name: key,
            in: from,
            required: fromSchema.required?.includes(key),
            style: from === 'query' ? 'deepObject' : undefined,
            schema: fromSchema.properties[key],
          })
        }
      }
    }

    if (schema.properties?.body !== undefined) {
      ref.requestBody = {
        required: schema.required?.includes('body'),
        content: toOpenAPIContent(schema.properties.body),
      }
    }
  }

  #successResponse(ref: OpenAPI.OperationObject, def: AnyContractProcedure['~orpc']): void {
    const outputSchema = def.outputSchema
    const status = fallbackContractConfig('defaultSuccessStatus', def.route.successStatus)
    const description = fallbackContractConfig('defaultSuccessDescription', def.route?.successDescription)
    const eventIteratorSchemaDetails = getEventIteratorSchemaDetails(outputSchema)
    const outputStructure = fallbackContractConfig('defaultOutputStructure', def.route.outputStructure)

    if (eventIteratorSchemaDetails) {
      ref.responses ??= {}
      ref.responses[status] = {
        description,
        content: toOpenAPIEventIteratorContent(
          this.converter.convert(eventIteratorSchemaDetails.yields, 'output'),
          this.converter.convert(eventIteratorSchemaDetails.returns, 'output'),
        ),
      }

      return
    }

    const [_, json] = this.converter.convert(outputSchema, 'output')

    ref.responses ??= {}
    ref.responses[status] = {
      description,
    }

    if (outputStructure === 'compact') {
      ref.responses[status].content = toOpenAPIContent(json)

      return
    }

    const error = new OpenAPIGeneratorError(
      'When output structure is "detailed", output schema must satisfy: '
      + '{ headers?: Record<string, unknown>, body?: unknown }',
    )

    if (!isObjectSchema(json)) {
      throw error
    }

    if (json.properties?.headers !== undefined) {
      if (!isObjectSchema(json.properties.headers)) {
        throw error
      }

      for (const key in json.properties.headers.properties) {
        ref.responses[status].headers ??= {}
        ref.responses[status].headers[key] = {
          schema: json.properties.headers.properties[key],
          required: json.properties.headers.required?.includes(key),
        }
      }
    }

    if (json.properties?.body !== undefined) {
      ref.responses[status].content = toOpenAPIContent(json.properties.body)
    }
  }

  #errorResponse(ref: OpenAPI.OperationObject, def: AnyContractProcedure['~orpc']): void {
    const errorMap = def.errorMap as ErrorMap

    const errors: Record<string, JSONSchema[]> = {}

    for (const code in errorMap) {
      const config = errorMap[code]

      if (!config) {
        continue
      }

      const status = fallbackORPCErrorStatus(code, config.status)

      const [dataRequired, dataSchema] = this.converter.convert(config.data, 'output')

      errors[status] ??= []
      errors[status].push({
        type: 'object',
        properties: {
          defined: { const: true },
          code: { const: code },
          status: { const: status },
          message: { type: 'string', default: config.message },
          data: dataSchema,
        },
        required: dataRequired ? ['defined', 'code', 'status', 'message', 'data'] : ['defined', 'code', 'status', 'message'],
      })
    }

    ref.responses ??= {}

    for (const status in errors) {
      const schemas = errors[status]!

      ref.responses[status] = {
        description: status,
        content: toOpenAPIContent({
          oneOf: [
            ...schemas,
            {
              type: 'object',
              properties: {
                defined: { const: false },
                code: { type: 'string' },
                status: { type: 'number' },
                message: { type: 'string' },
                data: {},
              },
              required: ['defined', 'code', 'status', 'message'],
            },
          ],
        }),
      }
    }
  }
}
