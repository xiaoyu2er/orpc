import type { StandardLinkOptions } from '../adapters/standard'
import type { ClientContext } from '../types'

export interface ClientPlugin<T extends ClientContext> {
  init?(options: StandardLinkOptions<T>): void
}

export class CompositeClientPlugin<T extends ClientContext> implements ClientPlugin<T> {
  constructor(private readonly plugins: ClientPlugin<T>[] = []) { }

  init(options: StandardLinkOptions<T>): void {
    for (const plugin of this.plugins) {
      plugin.init?.(options)
    }
  }
}
