import type { ClientContext } from '@orpc/client'
import type { OperationKey, OperationKeyOptions, OperationType } from './types'

/**
 * @todo move TClientContext to second position + remove default in next major version
 */
export function generateOperationKey<TType extends OperationType, TInput, TClientContext extends ClientContext = ClientContext>(
  path: readonly string[],
  state: OperationKeyOptions<TType, TInput, TClientContext> = {},
): OperationKey<TType, TInput, TClientContext> {
  return [path, {
    ...state.type !== undefined ? { type: state.type } : {},
    ...state.context !== undefined ? { context: state.context } : {},
    ...state.fnOptions !== undefined ? { fnOptions: state.fnOptions } : {},
    ...state.input !== undefined ? { input: state.input } : {},
  } as any]
}
