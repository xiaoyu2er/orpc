import * as v from 'valibot'

export type DurableEventIteratorJWTPayload = v.InferOutput<typeof DurableEventIteratorJWTPayloadSchema>

export const DurableEventIteratorJWTPayloadSchema = v.pipe(
  v.object({
    chn: v.string(), // Channel name
    att: v.optional(v.any()), // Attachment, if any
    exp: v.optional(v.number()), // Expiration time in seconds
  }),
  v.transform(payload => ({ att: undefined, ...payload })),
)
