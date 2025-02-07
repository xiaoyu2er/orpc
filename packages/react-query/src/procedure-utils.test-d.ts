import type { ErrorFromErrorMap } from '@orpc/contract'
import type { InfiniteData } from '@tanstack/react-query'
import type { baseErrorMap } from '../../contract/tests/shared'
import type { ProcedureUtils } from './procedure-utils'
import { useInfiniteQuery, useMutation, useQueries, useQuery, useSuspenseInfiniteQuery, useSuspenseQuery } from '@tanstack/react-query'

describe('ProcedureUtils', () => {
  const utils = {} as ProcedureUtils<{ batch?: boolean } | undefined, 'input' | undefined, 'output', ErrorFromErrorMap<typeof baseErrorMap>>

  describe('.queryOptions', () => {
    it('can optional options', () => {
      const requiredUtils = {} as ProcedureUtils<{ batch?: boolean }, 'input', 'output', Error>

      utils.queryOptions()
      utils.queryOptions({ context: { batch: true } })
      utils.queryOptions({ input: 'input' })

      requiredUtils.queryOptions({
        context: { batch: true },
        input: 'input',
      })
      // @ts-expect-error input and context is required
      requiredUtils.queryOptions()
      // @ts-expect-error input and context is required
      requiredUtils.queryOptions({})
      // @ts-expect-error input is required
      requiredUtils.queryOptions({ context: { batch: true } })
      // @ts-expect-error context is required
      requiredUtils.queryOptions({ input: 'input' })
    })

    it('infer correct input type', () => {
      utils.queryOptions({ input: 'input', context: { batch: true } })
      // @ts-expect-error invalid input
      utils.queryOptions({ input: 'invalid', context: { batch: true } })
    })

    it('infer correct context type', () => {
      utils.queryOptions({ input: 'input', context: { batch: true } })
      // @ts-expect-error invalid context
      utils.queryOptions({ input: 'input', context: { batch: 'invalid' } })
    })

    it('works with useQuery', () => {
      const query = useQuery({
        ...utils.queryOptions({
          select: data => ({ mapped: data }),
        }),
        throwOnError(error) {
          expectTypeOf(error).toEqualTypeOf<ErrorFromErrorMap<typeof baseErrorMap>>()
          return false
        },
      })

      expectTypeOf(query.data).toEqualTypeOf<{ mapped: 'output' } | undefined>()
      expectTypeOf(query.error).toEqualTypeOf<ErrorFromErrorMap<typeof baseErrorMap> | null>()
    })

    it('works with useSuspenseQuery', () => {
      const query = useSuspenseQuery({
        ...utils.queryOptions({
          select: data => ({ mapped: data }),
        }),
        retry(failureCount, error) {
          expectTypeOf(error).toEqualTypeOf<ErrorFromErrorMap<typeof baseErrorMap>>()
          return false
        },
      })

      expectTypeOf(query.data).toEqualTypeOf<{ mapped: 'output' }>()
      expectTypeOf(query.error).toEqualTypeOf<ErrorFromErrorMap<typeof baseErrorMap> | null>()
    })

    it('works with useQueries', async () => {
      const queries = useQueries({
        queries: [
          utils.queryOptions({
            select: data => ({ mapped: data }),
          }),
          utils.queryOptions({
            input: 'input',
            context: { batch: true },
          }),
        ],
      })

      expectTypeOf(queries[0].data).toEqualTypeOf<{ mapped: 'output' } | undefined>()
      expectTypeOf(queries[1].data).toEqualTypeOf<'output' | undefined>()

      // FIXME: useQueries cannot infer error
      // expectTypeOf(queries[0].error).toEqualTypeOf<Error | ORPCError<'NOT_FOUND', { id: string }> | null>()
      //   expectTypeOf(queries[0].error).toEqualTypeOf<null | Error | ORPCError<'TOO_MANY_REQUESTS', { keyword?: string, cursor: number }>>()
    })
  })

  describe('.infiniteOptions', () => {
    const getNextPageParam = {} as () => number
    const initialPageParam = 1

    it('can optional context', () => {
      const requiredUtils = {} as ProcedureUtils<{ batch?: boolean }, 'input' | undefined, 'output', Error>

      utils.infiniteOptions({
        input: () => 'input',
        getNextPageParam,
        initialPageParam,
      })

      requiredUtils.infiniteOptions({
        context: { batch: true },
        input: () => 'input',
        getNextPageParam,
        initialPageParam,
      })

      // @ts-expect-error --- missing context
      requiredUtils.infiniteOptions({
        input: () => 'input',
        getNextPageParam,
        initialPageParam,
      })
    })

    it('infer correct input & pageParam type', () => {
      utils.infiniteOptions({
        input: (pageParam) => {
          expectTypeOf(pageParam).toEqualTypeOf<number>()

          return 'input'
        },
        getNextPageParam,
        initialPageParam,
      })

      utils.infiniteOptions({
        input: (pageParam) => {
          expectTypeOf(pageParam).toEqualTypeOf<number | undefined>()

          return 'input'
        },
        getNextPageParam,
        initialPageParam: undefined,
      })

      utils.infiniteOptions({
        // @ts-expect-error invalid input
        input: (pageParam) => {
          expectTypeOf(pageParam).toEqualTypeOf<number>()

          return 'invalid'
        },
        getNextPageParam,
        initialPageParam,
      })

      utils.infiniteOptions({
        input: (pageParam: number) => {
          return 'input'
        },
        getNextPageParam,
        // @ts-expect-error expect number but got undefined
        initialPageParam: undefined,
      })
    })

    it('infer correct context type', () => {
      utils.infiniteOptions({
        context: { batch: true },
        input: () => 'input',
        getNextPageParam,
        initialPageParam,
      })

      utils.infiniteOptions({
        // @ts-expect-error invalid context
        context: { batch: 'invalid' },
        input: () => 'input',
        getNextPageParam,
        initialPageParam,
      })
    })

    it('works with useInfiniteQuery', () => {
      const query = useInfiniteQuery({
        ...utils.infiniteOptions({
          input: () => 'input',
          getNextPageParam,
          initialPageParam,
          select: data => ({ mapped: data }),
        }),
        throwOnError(error) {
          expectTypeOf(error).toEqualTypeOf<ErrorFromErrorMap<typeof baseErrorMap>>()
          return false
        },
      })

      expectTypeOf(query.data).toEqualTypeOf<{ mapped: InfiniteData<'output', number> } | undefined>()
      expectTypeOf(query.error).toEqualTypeOf<ErrorFromErrorMap<typeof baseErrorMap> | null>()
    })

    it('works with useSuspenseInfiniteQuery', () => {
      const query = useSuspenseInfiniteQuery({
        ...utils.infiniteOptions({
          input: () => ({} as any),
          getNextPageParam,
          initialPageParam,
          select: data => ({ mapped: data }),
        }),
        retry(failureCount, error) {
          expectTypeOf(error).toEqualTypeOf<ErrorFromErrorMap<typeof baseErrorMap>>()
          return false
        },
      })

      expectTypeOf(query.data).toEqualTypeOf<{ mapped: InfiniteData<'output', number> }>()
      expectTypeOf(query.error).toEqualTypeOf<ErrorFromErrorMap<typeof baseErrorMap> | null>()
    })
  })

  describe('.mutationOptions', () => {
    const utils = {} as ProcedureUtils<{ batch?: boolean } | undefined, 'input' | undefined, 'output', ErrorFromErrorMap<typeof baseErrorMap>>

    it('can optional options', () => {
      const requiredUtils = {} as ProcedureUtils<{ batch?: boolean }, 'input', 'output', Error>

      utils.mutationOptions()
      utils.mutationOptions({})

      requiredUtils.mutationOptions({
        context: { batch: true },
      })
      // @ts-expect-error context is required
      requiredUtils.mutationOptions()
      // @ts-expect-error context is required
      requiredUtils.mutationOptions({})
    })

    it('infer correct context type', () => {
      utils.mutationOptions({ context: { batch: true } })
      // @ts-expect-error invalid context
      utils.mutationOptions({ context: { batch: 'invalid' } })
    })

    it('works with useMutation', () => {
      const mutation = useMutation(utils.mutationOptions({
        onSuccess: (data, input) => {
          expectTypeOf(data).toEqualTypeOf<'output'>()
          expectTypeOf(input).toEqualTypeOf<'input' | undefined>()
        },
        onError: (error) => {
          expectTypeOf(error).toEqualTypeOf<ErrorFromErrorMap<typeof baseErrorMap>>()
        },
      }))

      expectTypeOf<Parameters<typeof mutation.mutate>[0]>().toEqualTypeOf<'input' | undefined>()
      expectTypeOf(mutation.data).toEqualTypeOf<'output' | undefined>()
      expectTypeOf(mutation.error).toEqualTypeOf<ErrorFromErrorMap<typeof baseErrorMap> | null>()
    })
  })
})
