import type { ClientContext, ClientOptions } from '@orpc/contract'
import type { Promisable } from '@orpc/shared'
import type { ClientLink } from './types'

/**
 * DynamicLink provides a way to dynamically resolve and delegate calls to other ClientLinks
 * based on the request path, input, and context.
 */
export class DynamicLink<TClientContext extends ClientContext> implements ClientLink<TClientContext> {
  constructor(
    private readonly linkResolver: (
      path: readonly string[],
      input: unknown,
      context: TClientContext,
    ) => Promisable<ClientLink<TClientContext>>,
  ) {
  }

  async call(path: readonly string[], input: unknown, options: ClientOptions<TClientContext>): Promise<unknown> {
    const clientContext = options.context ?? {} as TClientContext // options.context can be undefined when all field is optional

    const resolvedLink = await this.linkResolver(path, input, clientContext)

    const output = await resolvedLink.call(path, input, { ...options, context: clientContext })

    return output
  }
}
