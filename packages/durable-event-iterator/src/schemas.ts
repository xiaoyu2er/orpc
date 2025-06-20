import * as v from 'valibot'

export const DurableEventIteratorJWTPayloadSchema = v.object({
  chn: v.string(), // Channel name
  exp: v.optional(v.number()), // Expiration time in seconds
})

export type DurableEventIteratorJWTPayload = v.InferInput<typeof DurableEventIteratorJWTPayloadSchema>
