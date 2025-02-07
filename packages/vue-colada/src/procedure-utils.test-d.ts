import type { Client } from '@orpc/contract'
import type { ORPCError } from '@orpc/server'
import type { ProcedureUtils } from './procedure-utils'
import type { QueryOptions } from './types'
import { useMutation, useQuery } from '@pinia/colada'
import { ref } from 'vue'
import { createProcedureUtils } from './procedure-utils'

describe('queryOptions', () => {
  const client = {} as Client<undefined, number | undefined, string | undefined, Error>
  const utils = createProcedureUtils(client, [])

  const client2 = {} as Client<undefined, number, string, Error>
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

    expectTypeOf(options).toEqualTypeOf<QueryOptions<string | undefined, Error>>()
    // @ts-expect-error invalid is required
    utils2.queryOptions()
  })

  it('infer correct output type', () => {
    const query = useQuery(utils2.queryOptions({ input: 1 }))

    expectTypeOf(query.data.value).toEqualTypeOf<string | undefined>()
  })

  describe('client context', () => {
    it('can be optional', () => {
      const utils = {} as ProcedureUtils<undefined | { batch?: boolean }, undefined, string, Error>
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
      const utils = {} as ProcedureUtils<{ batch?: boolean }, undefined, string, Error>
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

  it('can infer errors', () => {
    const utils = {} as ProcedureUtils<unknown, unknown, unknown, Error | ORPCError<'CODE', 'data'>>
    expectTypeOf(useQuery(utils.queryOptions()).error.value).toEqualTypeOf<Error | ORPCError<'CODE', 'data'> | null>()
    expectTypeOf(useQuery(utils.queryOptions({})).error.value).toEqualTypeOf<Error | ORPCError<'CODE', 'data'> | null>()
  })
})

describe('mutationOptions', () => {
  const client = {} as Client<undefined, number, string, Error>
  const utils = createProcedureUtils(client, [])

  it('infer correct input type', () => {
    const option = utils.mutationOptions({
      onSuccess: (data, input) => {
        expectTypeOf(input).toEqualTypeOf<number>()
      },
    })

    const mutation = useMutation(option)

    mutation.mutate(1)

    // @ts-expect-error invalid input
    mutation.mutate('1')
    // @ts-expect-error invalid input
    mutation.mutate()
  })

  it('infer correct output type', () => {
    const option = utils.mutationOptions({
      onSuccess: (data, input) => {
        expectTypeOf(input).toEqualTypeOf<number>()
        expectTypeOf(data).toEqualTypeOf<string>()
      },
    })

    const mutation = useMutation(option)

    expectTypeOf(mutation.data.value).toEqualTypeOf<string | undefined>()
  })

  it('can be called without argument', () => {
    const mutation = useMutation(utils.mutationOptions())
    expectTypeOf(mutation.data.value).toEqualTypeOf<string | undefined>()
  })

  describe('client context', () => {
    it('can be optional', () => {
      const utils = {} as ProcedureUtils<undefined | { batch?: boolean }, undefined, string, Error>
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
      const utils = {} as ProcedureUtils<{ batch?: boolean }, undefined, string, Error>
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

  it('can infer errors', () => {
    const utils = {} as ProcedureUtils<unknown, unknown, unknown, Error | ORPCError<'CODE', 'data'>>
    expectTypeOf(useMutation(utils.mutationOptions()).error.value).toEqualTypeOf<Error | ORPCError<'CODE', 'data'> | null>()
    expectTypeOf(useMutation(utils.mutationOptions({})).error.value).toEqualTypeOf<Error | ORPCError<'CODE', 'data'> | null>()
  })
})
