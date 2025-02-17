import type { Promisable } from '@orpc/shared'
import type { ClientContext, ClientLink, ClientOptionsOut } from './types'

/**
 * DynamicLink provides a way to dynamically resolve and delegate calls to other ClientLinks
 * based on the request path, input, and context.
 */
export class DynamicLink<TClientContext extends ClientContext> implements ClientLink<TClientContext> {
  constructor(
    private readonly linkResolver: (
      options: ClientOptionsOut<TClientContext>,
      path: readonly string[],
      input: unknown,
    ) => Promisable<ClientLink<TClientContext>>,
  ) {
  }

  async call(path: readonly string[], input: unknown, options: ClientOptionsOut<TClientContext>): Promise<unknown> {
    const resolvedLink = await this.linkResolver(options, path, input)

    const output = await resolvedLink.call(path, input, options)

    return output
  }
}
