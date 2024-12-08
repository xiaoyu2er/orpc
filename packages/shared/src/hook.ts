import type { Arrayable, Merge, Promisable } from 'type-fest'
import { convertToStandardError } from './error'

export interface BaseHookMeta<TOutput> {
  next: () => Promise<TOutput>
}

export type FinishState<TOutput> =
  | [TOutput, undefined, 'success']
  | [undefined, Error, 'error']

export interface Hooks<TInput, TOutput, TContext, TMeta extends Record<string, unknown> & { next?: never } | undefined> {
  execute?: Arrayable<(input: TInput, context: TContext, meta: Merge<BaseHookMeta<TOutput>, TMeta>) => Promise<TOutput>>
  onStart?: Arrayable<(input: TInput, context: TContext, meta: TMeta) => Promisable<void>>
  onSuccess?: Arrayable<(output: TOutput, context: TContext, meta: TMeta) => Promisable<void>>
  onError?: Arrayable<(error: Error, context: TContext, meta: TMeta) => Promisable<void>>
  onFinish?: Arrayable<(state: FinishState<TOutput>, context: TContext, meta: TMeta) => Promisable<void>>
}

export async function executeWithHooks<TInput, TOutput, TContext, TMeta extends Record<string, unknown> & { next?: never } | undefined>(
  options: {
    hooks?: Hooks<TInput, TOutput, TContext, TMeta>
    input: TInput
    context: TContext
    meta: TMeta
    execute: BaseHookMeta<TOutput>['next']
  },
): Promise<FinishState<TOutput>> {
  let state: FinishState<TOutput> | undefined

  const executes = convertToArray(options.hooks?.execute)
  const onStarts = convertToArray(options.hooks?.onStart)
  const onSuccesses = convertToArray(options.hooks?.onSuccess)
  const onErrors = convertToArray(options.hooks?.onError)
  const onFinishes = convertToArray(options.hooks?.onFinish)

  let currentExecuteIndex = 0

  const next = async (): Promise<TOutput> => {
    const execute = executes[currentExecuteIndex]

    if (!execute) {
      return await options.execute()
    }

    currentExecuteIndex++
    return await execute(options.input, options.context, {
      ...options.meta,
      next,
    })
  }

  try {
    for (const onStart of onStarts) {
      await onStart(options.input, options.context, options.meta)
    }

    const output = await next()

    for (let i = onSuccesses.length - 1; i >= 0; i--) {
      await onSuccesses[i]!(output, options.context, options.meta)
    }

    state = [output, undefined, 'success']
  }
  catch (e) {
    state = [undefined, convertToStandardError(e), 'error']

    for (let i = onErrors.length - 1; i >= 0; i--) {
      try {
        await onErrors[i]!(state[1], options.context, options.meta)
      }
      catch (e) {
        state = [undefined, convertToStandardError(e), 'error']
      }
    }
  }

  for (let i = onFinishes.length - 1; i >= 0; i--) {
    try {
      await onFinishes[i]!(state, options.context, options.meta)
    }
    catch (e) {
      state = [undefined, convertToStandardError(e), 'error']
    }
  }

  return state
}

export function convertToArray<T>(value: undefined | T | readonly T[]): readonly T[] {
  if (value === undefined) {
    return []
  }

  return Array.isArray(value) ? value : [value] as any
}
