import { DurableIteratorObject } from '@orpc/experimental-durable-iterator/durable-object'
import { os } from '@orpc/server'
import * as z from 'zod'

export class ChatRoom extends DurableIteratorObject<{ message: string }> {
  publishMessageRPC() {
    return os
      .input(z.object({ message: z.string() }))
      .handler(({ input }) => {
        this.publishEvent(input)
      })
      .callable()
  }
}
