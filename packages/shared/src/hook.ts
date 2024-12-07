import type { Arrayable, Merge, Promisable } from 'type-fest'
import { convertToStandardError } from './error'

export interface BaseGeneralHookMeta<TOutput> {
  next: () => Promise<TOutput>
}

export type FinishState<TOutput> =
  | { status: 'success', output: TOutput, error: undefined }
  | { status: 'error', output: undefined, error: Error }

export interface GeneralHook<TInput, TOutput, TContext, TMeta extends Record<string, unknown> & { next?: never } | undefined> {
  execute?: Arrayable<(input: TInput, context: TContext, meta: Merge<BaseGeneralHookMeta<TOutput>, TMeta>) => Promise<TOutput>>
  onStart?: Arrayable<(input: TInput, context: TContext, meta: TMeta) => Promisable<void>>
  onSuccess?: Arrayable<(output: TOutput, context: TContext, meta: TMeta) => Promisable<void>>
  onError?: Arrayable<(error: Error, context: TContext, meta: TMeta) => Promisable<void>>
  onFinish?: Arrayable<(state: FinishState<TOutput>, context: TContext, meta: TMeta) => Promisable<void>>
}

export async function implementGeneralHook<TInput, TOutput, TContext, TMeta extends Record<string, unknown> & { next?: never } | undefined>(
  options: {
    hooks?: GeneralHook<TInput, TOutput, TContext, TMeta>
    input: TInput
    context: TContext
    meta: TMeta
    execute: BaseGeneralHookMeta<TOutput>['next']
  },
): Promise<TOutput> {
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

    state = { status: 'success', output, error: undefined }
  }
  catch (e) {
    state = { status: 'error', error: convertToStandardError(e), output: undefined }

    for (let i = onErrors.length - 1; i >= 0; i--) {
      try {
        await onErrors[i]!(state.error, options.context, options.meta)
      }
      catch (e) {
        state = { status: 'error', error: convertToStandardError(e), output: undefined }
      }
    }
  }

  for (let i = onFinishes.length - 1; i >= 0; i--) {
    try {
      await onFinishes[i]!(state, options.context, options.meta)
    }
    catch (e) {
      state = { status: 'error', output: undefined, error: convertToStandardError(e) }
    }
  }

  if (state.status === 'error') {
    throw state.error
  }

  return state.output
}

export function convertToArray<T>(value: undefined | T | readonly T[]): readonly T[] {
  if (value === undefined) {
    return []
  }

  return Array.isArray(value) ? value : [value] as any
}
