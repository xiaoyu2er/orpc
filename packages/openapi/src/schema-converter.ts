import type { AnySchema } from '@orpc/contract'
import type { Promisable } from '@orpc/shared'
import type { JSONSchema } from './schema'

export interface SchemaConvertOptions {
  strategy: 'input' | 'output'
}

export interface SchemaConverter {
  convert(schema: AnySchema | undefined, options: SchemaConvertOptions): Promisable<[required: boolean, jsonSchema: JSONSchema]>
}

export interface ConditionalSchemaConverter extends SchemaConverter {
  condition(schema: AnySchema | undefined, options: SchemaConvertOptions): Promisable<boolean>
}

export class CompositeSchemaConverter implements SchemaConverter {
  private readonly converters: ConditionalSchemaConverter[]

  constructor(converters: ConditionalSchemaConverter[]) {
    this.converters = converters
  }

  async convert(schema: AnySchema | undefined, options: SchemaConvertOptions): Promise<[required: boolean, jsonSchema: JSONSchema]> {
    for (const converter of this.converters) {
      if (await converter.condition(schema, options)) {
        return converter.convert(schema, options)
      }
    }

    return [false, {}]
  }
}
