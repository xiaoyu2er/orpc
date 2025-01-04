import type { HTTPPath } from '@orpc/contract'
import type { Context, WithSignal } from '../../types'

export type FetchOptions<TContext extends Context, TReturnFalseOnNoMatch extends boolean> =
  & WithSignal
  & { prefix?: HTTPPath, returnFalseOnNoMatch?: TReturnFalseOnNoMatch }
  & (undefined extends TContext ? { context?: TContext } : { context: TContext })

export interface FetchHandler<T extends Context> {
  fetch: <UReturnFalseOnNoMatch extends boolean = false>(
    request: Request,
    ...opt: [options: FetchOptions<T, UReturnFalseOnNoMatch>] | (undefined extends T ? [] : never)
  ) => Promise<Response | (true extends UReturnFalseOnNoMatch ? false : never)>
}

export interface ConditionalFetchHandler<T extends Context> extends FetchHandler<T> {
  condition: (request: Request) => boolean
}
