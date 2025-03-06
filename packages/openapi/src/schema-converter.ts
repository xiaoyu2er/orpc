import type { Schema } from '@orpc/contract'
import type { JSONSchema } from './schema'

export type SchemaConvertStrategy = 'input' | 'output'

export interface ConditionalSchemaConverter {
  condition(schema: Schema, strategy: SchemaConvertStrategy): boolean

  convert(schema: Schema, strategy: SchemaConvertStrategy): [required: boolean, jsonSchema: JSONSchema]
}

export class CompositeSchemaConverter {
  private readonly converters: ConditionalSchemaConverter[]

  constructor(converters: ConditionalSchemaConverter[]) {
    this.converters = converters
  }

  convert(schema: Schema, strategy: SchemaConvertStrategy): [required: boolean, jsonSchema: JSONSchema] {
    for (const converter of this.converters) {
      if (converter.condition(schema, strategy)) {
        return converter.convert(schema, strategy)
      }
    }

    return [false, {}]
  }
}
