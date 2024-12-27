import type { Schema } from '@orpc/contract'

export interface SchemaCoercer {
  coerce: (schema: Schema, value: unknown) => unknown
}

export class CompositeSchemaCoercer implements SchemaCoercer {
  constructor(
    private readonly coercers: SchemaCoercer[],
  ) {}

  coerce(schema: Schema, value: unknown): unknown {
    let current = value
    for (const coercer of this.coercers) {
      current = coercer.coerce(schema, current)
    }

    return current
  }
}
