import { DurableIteratorObject } from '@orpc/experimental-durable-iterator/durable-object'
import { os } from '@orpc/server'
import * as z from 'zod'

export class ChatRoom extends DurableIteratorObject<{ message: string }> {
  constructor(
    ctx: DurableObjectState,
    env: Env,
  ) {
    super(ctx, env, {
      resumeRetentionSeconds: 60 * 2, // 2 minutes
    })
  }

  publishMessageRPC() {
    return os
      .input(z.object({ message: z.string() }))
      .handler(({ input }) => {
        this.publishEvent(input)
      })
      .callable()
  }
}
