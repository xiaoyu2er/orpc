export type SchemaInputForInfiniteQuery<TInput> = Omit<TInput, 'cursor'>

export type InferCursor<TInput> = TInput extends { cursor?: any } ? TInput['cursor'] : never
