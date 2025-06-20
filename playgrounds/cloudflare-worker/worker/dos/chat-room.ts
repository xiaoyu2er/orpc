import {
  experimental_DurableEventIteratorObject as DurableEventIteratorObject,
} from '@orpc/durable-event-iterator/object'

export class ChatRoom extends DurableEventIteratorObject<{ message: string }> {
  publishMessage(message: string): void {
    this.orpcWebsocketManager.publishEvent({ message })
  }
}
