import type { OpenAPITransformer } from './types'

export class OpenAPICompositeTransformer implements OpenAPITransformer {
  constructor(private transformers: OpenAPITransformer[]) {}

  async deserialize(input: unknown): Promise<unknown> {
    let current = input

    for (const transformer of this.transformers) {
      current = await transformer.deserialize(current)
    }

    return current
  }

  async serialize(output: unknown): Promise<unknown> {
    let current = output

    for (const transformer of this.transformers.reverse()) {
      current = transformer.serialize(current)
    }

    return current
  }
}
