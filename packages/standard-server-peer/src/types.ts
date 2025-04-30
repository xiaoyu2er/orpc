import type { Promisable } from '@orpc/shared'

export type EncodedMessage = string | ArrayBufferLike | Blob

export interface EncodedMessageSendFn {
  (message: EncodedMessage): Promisable<void>
}
