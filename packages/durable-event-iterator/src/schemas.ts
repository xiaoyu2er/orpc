import * as v from 'valibot'

export type DurableEventIteratorTokenPayload = v.InferOutput<typeof DurableEventIteratorTokenPayloadSchema>

export const DurableEventIteratorTokenPayloadSchema = v.object({
  chn: v.string(), // Channel name
  att: v.any(), // Attachment
  rpc: v.pipe(v.array(v.string()), v.readonly()), // Remote method calls (allowed methods)
  exp: v.optional(v.number()), // Expiration time in seconds
})
