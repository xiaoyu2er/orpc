import type { OpenAPITransformer, OpenAPITransformerMeta } from './transformer'

export class OpenAPICompositeTransformer implements OpenAPITransformer {
  constructor(private transformers: OpenAPITransformer[]) {}

  async deserialize(input: unknown, meta: OpenAPITransformerMeta): Promise<unknown> {
    let current = input

    for (const transformer of this.transformers) {
      current = await transformer.deserialize(current, meta)
    }

    return current
  }

  async serialize(output: unknown, meta: OpenAPITransformerMeta): Promise<unknown> {
    let current = output

    for (const transformer of this.transformers.reverse()) {
      current = transformer.serialize(current, meta)
    }

    return current
  }
}
