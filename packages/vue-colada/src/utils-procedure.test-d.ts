import type { ProcedureClient } from '@orpc/server'
import type { ComputedRef } from 'vue'
import type { UseQueryFnContext } from './types'
import type { ProcedureUtils } from './utils-procedure'
import { type EntryKey, useMutation, useQuery } from '@pinia/colada'
import { ref } from 'vue'
import { createProcedureUtils } from './utils-procedure'

describe('queryOptions', () => {
  const client = vi.fn <ProcedureClient<number | undefined, string | undefined, undefined>>(
    (...[input]) => Promise.resolve(input?.toString()),
  )
  const utils = createProcedureUtils(client, [])

  const client2 = {} as ProcedureClient<number, string, undefined>
  const utils2 = createProcedureUtils(client2, [])

  it('infer correct input type', () => {
    utils.queryOptions({ input: 1 })
    utils.queryOptions({ input: ref(1) })
    utils.queryOptions({ input: undefined })
    utils.queryOptions({ input: ref(undefined) })

    // @ts-expect-error invalid input
    utils.queryOptions({ input: '1' })
    // @ts-expect-error invalid input
    utils.queryOptions({ input: ref('1') })
  })

  it('can be called without argument', () => {
    const options = utils.queryOptions()

    expectTypeOf(options.key).toEqualTypeOf<ComputedRef<EntryKey>>()
    expectTypeOf(options.query).toEqualTypeOf<(ctx: UseQueryFnContext) => Promise<string | undefined>>()
    // @ts-expect-error invalid is required
    utils2.queryOptions()
  })

  it('infer correct output type', () => {
    const query = useQuery(utils2.queryOptions({ input: 1 }))

    expectTypeOf(query.data.value).toEqualTypeOf<string | undefined>()
  })

  describe('client context', () => {
    it('can be optional', () => {
      const utils = {} as ProcedureUtils<undefined, string, undefined | { batch?: boolean }>
      useQuery(utils.queryOptions())
      useQuery(utils.queryOptions({}))
      useQuery(utils.queryOptions({ context: undefined }))
      useQuery(utils.queryOptions({ context: { batch: true } }))
      useQuery(utils.queryOptions({ context: { batch: ref(true) } }))
      // @ts-expect-error --- invalid context
      useQuery(utils.queryOptions({ context: { batch: 'invalid' } }))
      // @ts-expect-error --- invalid context
      useQuery(utils.queryOptions({ context: { batch: ref('invalid') } }))
    })

    it('required pass context when non-optional', () => {
      const utils = {} as ProcedureUtils<undefined, string, { batch?: boolean }>
      // @ts-expect-error --- missing context
      useQuery(utils.queryOptions())
      // @ts-expect-error --- missing context
      useQuery(utils.queryOptions({}))
      useQuery(utils.queryOptions({ context: { batch: true } }))
      useQuery(utils.queryOptions({ context: { batch: ref(false) } }))
      // @ts-expect-error --- invalid context
      useQuery(utils.queryOptions({ context: { batch: 'invalid' } }))
      // @ts-expect-error --- invalid context
      useQuery(utils.queryOptions({ context: { batch: ref('invalid') } }))
    })
  })
})

describe('mutationOptions', () => {
  const client = {} as ProcedureClient<number, string, undefined>
  const utils = createProcedureUtils(client, [])

  it('infer correct input type', () => {
    const option = utils.mutationOptions({
      onSuccess: (data, input) => {
        expectTypeOf(input).toEqualTypeOf<number>()
      },
    })

    option.mutation(1)

    // @ts-expect-error invalid input
    option.mutation('1')
    // @ts-expect-error invalid input
    option.mutation()
  })

  it('infer correct output type', () => {
    const option = utils.mutationOptions({
      onSuccess: (data, input) => {
        expectTypeOf(input).toEqualTypeOf<number>()
        expectTypeOf(data).toEqualTypeOf<string>()
      },
    })

    expectTypeOf(option.mutation).toEqualTypeOf<(input: number) => Promise<string>>()
  })

  it('can be called without argument', () => {
    const option = utils.mutationOptions()

    expectTypeOf(option.key).toEqualTypeOf<(input: number) => EntryKey>()
    expectTypeOf(option.mutation).toMatchTypeOf<(input: number) => Promise<string>>()
  })

  describe('client context', () => {
    it('can be optional', () => {
      const utils = {} as ProcedureUtils<undefined, string, undefined | { batch?: boolean }>
      useMutation(utils.mutationOptions())
      useMutation(utils.mutationOptions({}))
      useMutation(utils.mutationOptions({ context: undefined }))
      useMutation(utils.mutationOptions({ context: { batch: true } }))
      useMutation(utils.mutationOptions({ context: { batch: ref(false) } }))
      // @ts-expect-error --- invalid context
      useMutation(utils.mutationOptions({ context: { batch: 'invalid' } }))
      // @ts-expect-error --- invalid context
      useMutation(utils.mutationOptions({ context: { batch: ref('invalid') } }))
    })

    it('required pass context when non-optional', () => {
      const utils = {} as ProcedureUtils<undefined, string, { batch?: boolean }>
      // @ts-expect-error --- missing context
      useMutation(utils.mutationOptions())
      // @ts-expect-error --- missing context
      useMutation(utils.mutationOptions({}))
      useMutation(utils.mutationOptions({ context: { batch: true } }))
      useMutation(utils.mutationOptions({ context: { batch: ref(false) } }))
      // @ts-expect-error --- invalid context
      useMutation(utils.mutationOptions({ context: { batch: 123 } }))
      // @ts-expect-error --- invalid context
      useMutation(utils.mutationOptions({ context: { batch: ref(123) } }))
    })
  })
})
