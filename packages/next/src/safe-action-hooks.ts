import type { SchemaInput, SchemaOutput } from '@orpc/contract'
import type { SafeAction } from './safe-action'
import { type Lazy, ORPCError, type Procedure } from '@orpc/server'
import { type GeneralHook, implementGeneralHook } from '@orpc/shared'
import { useCallback, useMemo, useState } from 'react'

export type GeneralHookFromSafeAction<T extends SafeAction<any>> = T extends SafeAction<
  | Procedure<any, any, infer UInputSchema, infer UOutputSchema, infer UFuncOutput>
  | Lazy<Procedure<any, any, infer UInputSchema, infer UOutputSchema, infer UFuncOutput>>
>
  ? GeneralHook<SchemaInput<UInputSchema>, SchemaOutput<UOutputSchema, UFuncOutput>, undefined, unknown>
  : never

export type UseSafeActionExecuteFn<T extends SafeAction<any>> = (
  ...options:
    | [input: Parameters<T>[0], hooks?: GeneralHookFromSafeAction<T>]
    | (undefined extends Parameters<T>[0] ? [] : never)
) => Promise<
  | [(Awaited<ReturnType<T>> & [unknown, unknown, 'success'])[0], undefined]
  | [undefined, Error]
>

export type UseSafeActionResult<T extends SafeAction<any>> = {
  execute: UseSafeActionExecuteFn<T>
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
    data: (Awaited<ReturnType<T>> & [unknown, unknown, 'success'])[0]
  } | {
    status: 'error'
    isPending: false
    isError: true
    error: Error
    data: undefined
  }
)

export function useSafeAction<T extends SafeAction<any>>(
  action: T,
  hooks?: GeneralHookFromSafeAction<T>,
): UseSafeActionResult<T> {
  const [state, setState] = useState<Omit<UseSafeActionResult<T>, 'execute' | 'reset'>>({
    status: 'idle',
    isPending: false,
    isError: false,
    error: undefined,
    data: undefined,
  })

  const reset = useCallback(() => {
    setState({
      status: 'idle',
      isPending: false,
      isError: false,
      error: undefined,
      data: undefined,
    })
  }, [])

  const execute = useCallback(async (input: any, executeHooks?: GeneralHookFromSafeAction<T>) => {
    const next = async () => {
      const next2 = async () => {
        setState({
          status: 'pending',
          isPending: true,
          isError: false,
          error: undefined,
          data: undefined,
        })

        try {
          const [output, errorJson, status] = await action(input)
          const error = status === 'error' ? ORPCError.fromJSON(errorJson) : undefined

          if (error) {
            setState({
              status: 'error',
              isPending: false,
              isError: true,
              error,
              data: undefined,
            })
          }
          else {
            setState({
              status: 'success',
              isPending: false,
              isError: false,
              error: undefined,
              data: output,
            })
          }

          return [output, error]
        }
        catch (e) {
          const error = e instanceof Error ? e : new Error('Unknown error', { cause: e })

          setState({
            status: 'error',
            isPending: false,
            isError: true,
            error,
            data: undefined,
          })

          return [undefined, error]
        }
      }

      return implementGeneralHook({
        context: undefined,
        hook: executeHooks ?? {},
        input,
        meta: {
          next: next2,
        },
      })
    }

    return implementGeneralHook({
      context: undefined,
      input,
      hook: hooks ?? {},
      meta: {
        next,
      },
    })
  }, [action, hooks])

  const result = useMemo(() => ({
    ...state,
    execute,
    reset,
  }), [state, execute, reset])

  return result as any
}
