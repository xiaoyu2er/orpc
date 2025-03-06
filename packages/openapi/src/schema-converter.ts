import type { Schema } from '@orpc/contract'
import type { JSONSchema } from './schema'

export type SchemaConvertStrategy = 'input' | 'output'

export interface SchemaConverter {
  convert(schema: Schema, strategy: SchemaConvertStrategy): [required: boolean, jsonSchema: JSONSchema]
}

export interface ConditionalSchemaConverter extends SchemaConverter {
  condition(schema: Schema, strategy: SchemaConvertStrategy): boolean
}

export class CompositeSchemaConverter implements SchemaConverter {
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
