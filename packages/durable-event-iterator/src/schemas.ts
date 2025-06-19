import * as v from 'valibot'

export const experimental_DurableEventIteratorJWTPayloadSchema = v.object({
  chn: v.string(), // Channel name
  exp: v.optional(v.number()), // Expiration time in seconds
})

export type experimental_DurableEventIteratorJWTPayload = v.InferInput<typeof experimental_DurableEventIteratorJWTPayloadSchema>
