import { convertToStandardError } from '@orpc/server'
import { convertToArray, type GeneralHook, implementGeneralHook } from '@orpc/shared'
import { useCallback, useMemo, useState } from 'react'

export type UseActionExecuteFn<TInput, TOutput> = (
  ...options:
    | [input: TInput, hooks?: GeneralHook<TInput, TOutput, undefined, undefined>]
    | (undefined extends TInput ? [] : never)
) => Promise<[TOutput, undefined, 'success'] | [undefined, Error, 'error']>

export type UseActionState<TInput, TOutput> = {
  execute: UseActionExecuteFn<TInput, TOutput>
  reset: () => void
} & (
  | {
    status: 'idle'
    isPending: false
    isError: false
    error: undefined
    data: undefined
  }
  | {
    status: 'pending'
    isPending: true
    isError: false
    error: undefined
    data: undefined
  }
  | {
    status: 'success'
    isPending: false
    isError: false
    error: undefined
    data: TOutput
  } | {
    status: 'error'
    isPending: false
    isError: true
    error: Error
    data: undefined
  }
)

const idleState = {
  status: 'idle',
  isPending: false,
  isError: false,
  error: undefined,
  data: undefined,
} as const

export function useAction<TInput, TOutput>(
  action: (input: TInput) => Promise<TOutput>,
  hooks?: GeneralHook<TInput, TOutput, undefined, undefined>,
): UseActionState<TInput, TOutput> {
  const [state, setState] = useState<Omit<UseActionState<TInput, TOutput>, 'execute' | 'reset'>>(idleState)

  const reset = useCallback(() => {
    setState(idleState)
  }, [])

  const execute = useCallback(async (input: any, executeHooks?: GeneralHook<TInput, TOutput, undefined, undefined>) => {
    setState({
      status: 'pending',
      isPending: true,
      isError: false,
      error: undefined,
      data: undefined,
    })

    try {
      const output = await implementGeneralHook({
        context: undefined,
        hooks: {
          execute: [...convertToArray(hooks?.execute), ...convertToArray(executeHooks?.execute)],
          onStart: [...convertToArray(hooks?.onStart), ...convertToArray(executeHooks?.onStart)],
          onSuccess: [...convertToArray(hooks?.onSuccess), ...convertToArray(executeHooks?.onSuccess)],
          onError: [...convertToArray(hooks?.onError), ...convertToArray(executeHooks?.onError)],
          onFinish: [...convertToArray(hooks?.onFinish), ...convertToArray(executeHooks?.onFinish)],
        },
        input,
        meta: undefined,
        execute: () => action(input),
      })

      setState({
        status: 'success',
        isPending: false,
        isError: false,
        error: undefined,
        data: output,
      })

      return [output, undefined, 'success']
    }
    catch (e) {
      const error = convertToStandardError(e)

      setState({
        status: 'error',
        isPending: false,
        isError: true,
        error,
        data: undefined,
      })

      return [undefined, error, 'error']
    }
  }, [action, hooks])

  const result = useMemo(() => ({
    ...state,
    execute,
    reset,
  }), [state, execute, reset])

  return result as any
}
