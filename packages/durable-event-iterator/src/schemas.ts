import { getSignedValue, sign, unsign } from '@orpc/server/helpers'
import { parseEmptyableJSON, stringifyJSON } from '@orpc/shared'
import * as v from 'valibot'
import { DurableEventIteratorError } from './error'

export type TokenPayload = v.InferOutput<typeof TokenPayloadSchema>

const TokenPayloadSchema = v.object({
  id: v.pipe(v.string(), v.description('Unique identifier per client')),
  chn: v.pipe(v.string(), v.description('Channel name')),
  att: v.pipe(v.optional(v.unknown()), v.description('Attachment')),
  rpc: v.pipe(v.optional(v.array(v.string())), v.readonly(), v.description('Allowed remote methods')),
  exp: v.pipe(v.number(), v.description('Expiration time in seconds')),
})

/**
 * Signs and encodes a token payload.
 */
export function signToken(secret: string, payload: TokenPayload): Promise<string> {
  return sign(stringifyJSON(payload), secret)
}

/**
 * Verifies a token and returns the payload if valid.
 */
export async function verifyToken(secret: string, token: string): Promise<TokenPayload | undefined> {
  try {
    const payload = parseEmptyableJSON(await unsign(token, secret))

    if (!v.is(TokenPayloadSchema, payload)) {
      return undefined
    }

    if (payload.exp < (Date.now() / 1000)) {
      return undefined
    }

    return payload
  }
  catch {
    // parseEmptyableJSON can throw error if the token contains invalid json
    return undefined
  }
}

/**
 * Extracts the payload from a token without verifying its signature.
 *
 * @throws if invalid format
 */
export function parseToken(token: string | null | undefined): TokenPayload {
  try {
    const payload = parseEmptyableJSON(getSignedValue(token))
    return v.parse(TokenPayloadSchema, payload)
  }
  catch (error) {
    throw new DurableEventIteratorError('Invalid token payload', { cause: error })
  }
}
