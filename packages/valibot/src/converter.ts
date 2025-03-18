import type { AnySchema } from '@orpc/contract'
import type { ConditionalSchemaConverter, JSONSchema, SchemaConvertOptions } from '@orpc/openapi'
import { type ConversionConfig, toJsonSchema } from '@valibot/to-json-schema'

export interface Experimental_ValibotToJsonSchemaConverterOptions extends Pick<ConversionConfig, 'errorMode'> {

}

export class Experimental_ValibotToJsonSchemaConverter implements ConditionalSchemaConverter {
  private readonly errorMode: Experimental_ValibotToJsonSchemaConverterOptions['errorMode']

  constructor(options: Experimental_ValibotToJsonSchemaConverterOptions = {}) {
    this.errorMode = options.errorMode ?? 'ignore'
  }

  condition(schema: AnySchema | undefined): boolean {
    return schema !== undefined && schema['~standard'].vendor === 'valibot'
  }

  convert(schema: AnySchema | undefined, _options: SchemaConvertOptions): [required: boolean, jsonSchema: Exclude<JSONSchema, boolean>] {
    const jsonSchema = toJsonSchema(schema as any, { errorMode: this.errorMode })

    return [true, jsonSchema as any]
  }
}
