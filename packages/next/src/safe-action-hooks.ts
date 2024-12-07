import type { SafeAction } from './safe-action'
import { ORPCError, type WELL_ORPC_ERROR_JSON } from '@orpc/server'
import { useCallback, useMemo, useState } from 'react'

export type UseSafeActionResult<T extends SafeAction<any>> = {
  execute: SafeAction<any>
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
    data: Awaited<ReturnType<T>>
  } | {
    status: 'error'
    isPending: false
    isError: true
    error: WELL_ORPC_ERROR_JSON
    data: undefined
  }
)

export function useSafeAction<T extends SafeAction<any>>(action: T): UseSafeActionResult<T> {
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

  const execute = useCallback(async (...input: any) => {
    reset()

    try {
      const [output, error] = await action(...input)

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
      const error = new ORPCError({
        code: 'SERVICE_UNAVAILABLE',
        message: e instanceof Error ? e.message : 'Service unavailable',
        cause: e,
      })

      const errorJson = error.toJSON()

      setState({
        status: 'error',
        isPending: false,
        isError: true,
        error: errorJson,
        data: undefined,
      })

      return [undefined, errorJson]
    }
  }, [action, reset])

  const result = useMemo(() => ({
    ...state,
    execute,
    reset,
  }), [state, execute, reset])

  return result as any
}
