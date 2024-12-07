import type { Promisable } from 'type-fest'

export interface BaseGeneralHookMeta<TOutput> {
  next: () => Promise<TOutput>
}

export interface GeneralHook<TInput, TOutput, TContext, TMeta extends Record<string, unknown>> {
  execute?: (input: TInput, context: TContext, meta: BaseGeneralHookMeta<TOutput> & TMeta) => Promise<TOutput>
  onSuccess?: (output: TOutput, context: TContext) => Promisable<void>
  onError?: (error: unknown, context: TContext) => Promisable<void>
  onFinish?: (context: TContext) => Promisable<void>
}

export async function implementGeneralHook<TInput, TOutput, TContext, TMeta extends Record<string, unknown>>(
  options: {
    hook: GeneralHook<TInput, TOutput, TContext, TMeta>
    input: TInput
    context: TContext
    meta: BaseGeneralHookMeta<TOutput> & TMeta
  },
): Promise<TOutput> {
  try {
    const output = await options.hook.execute?.(options.input, options.context, options.meta)
      ?? await options.meta.next()
    await options.hook.onSuccess?.(output, options.context)
    return output
  }
  catch (error) {
    await options.hook.onError?.(error, options.context)
    throw error
  }
  finally {
    await options.hook.onFinish?.(options.context)
  }
}
