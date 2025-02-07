import type { ErrorFromErrorMap } from '@orpc/contract'
import type { InfiniteData } from '@tanstack/vue-query'
import type { baseErrorMap } from '../../contract/tests/shared'
import type { ProcedureUtils } from './utils-procedure'
import { useInfiniteQuery, useMutation, useQueries, useQuery } from '@tanstack/vue-query'
import { queryClient } from '../tests/shared'

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
          throwOnError(error) {
            expectTypeOf(error).toEqualTypeOf<ErrorFromErrorMap<typeof baseErrorMap>>()
            return false
          },
        }),
      })

      expectTypeOf(query.data.value).toEqualTypeOf<{ mapped: 'output' } | undefined>()
      expectTypeOf(query.error.value).toEqualTypeOf<ErrorFromErrorMap<typeof baseErrorMap> | null>()
    })

    it('works with useQueries', async () => {
      const queries = useQueries({
        queries: [
          utils.queryOptions({}),
          utils.queryOptions({
            input: 'input',
            context: { batch: true },
          }),
        ],
      })

      expectTypeOf(queries.value[0].data).toEqualTypeOf<'output' | undefined>()
      expectTypeOf(queries.value[1].data).toEqualTypeOf<'output' | undefined>()

      expectTypeOf(queries.value[0].error).toEqualTypeOf<null | ErrorFromErrorMap<typeof baseErrorMap>>()
      expectTypeOf(queries.value[1].error).toEqualTypeOf<null | ErrorFromErrorMap<typeof baseErrorMap>>()
    })

    it('works with fetchQuery', () => {
      expectTypeOf(
        queryClient.fetchQuery(utils.queryOptions()),
      ).toEqualTypeOf<
        Promise<'output'>
      >()
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
        // @ts-expect-error conflict types
        input: (pageParam: number) => {
          return 'input'
        },
        // @ts-expect-error conflict types
        getNextPageParam,
        // @ts-expect-error conflict types
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
      const query = useInfiniteQuery(utils.infiniteOptions({
        input: () => 'input',
        getNextPageParam,
        initialPageParam,
        select: data => ({ mapped: data }),
        throwOnError(error) {
          expectTypeOf(error).toEqualTypeOf<ErrorFromErrorMap<typeof baseErrorMap>>()
          return false
        },
      }))

      expectTypeOf(query.data.value).toEqualTypeOf<{ mapped: InfiniteData<'output', number> } | undefined>()
      expectTypeOf(query.error.value).toEqualTypeOf<ErrorFromErrorMap<typeof baseErrorMap> | null>()
    })

    it('works with fetchInfiniteQuery', () => {
      expectTypeOf(
        queryClient.fetchInfiniteQuery(utils.infiniteOptions({
          input: () => 'input',
          getNextPageParam,
          initialPageParam,
        })),
      ).toEqualTypeOf<
        Promise<InfiniteData<'output', number>>
      >()
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
      expectTypeOf(mutation.data.value).toEqualTypeOf<'output' | undefined>()
      expectTypeOf(mutation.error.value).toEqualTypeOf<ErrorFromErrorMap<typeof baseErrorMap> | null>()
    })
  })
})
