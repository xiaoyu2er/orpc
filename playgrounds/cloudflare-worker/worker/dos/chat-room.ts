import { DurableEventIteratorObject } from '@orpc/durable-event-iterator/durable-object'

export class ChatRoom extends DurableEventIteratorObject<{ message: string }> {
  publishMessage(message: string): void {
    this.orpcWebsocketManager.publishEvent({ message })
  }
}
