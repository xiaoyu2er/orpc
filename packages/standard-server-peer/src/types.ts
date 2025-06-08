import type { Promisable } from '@orpc/shared'

export type EncodedMessage = string | ArrayBufferLike

export interface EncodedMessageSendFn {
  (message: EncodedMessage): Promisable<void>
}
