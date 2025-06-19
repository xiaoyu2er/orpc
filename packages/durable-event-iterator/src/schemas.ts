import * as v from 'valibot'

export const experimental_DurableEventIteratorJWTPayloadSchema = v.object({
  channel: v.string(),
})

export type experimental_DurableEventIteratorJWTPayload = v.InferInput<typeof experimental_DurableEventIteratorJWTPayloadSchema>
