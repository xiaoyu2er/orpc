import { useMutation, useQuery } from '@pinia/colada'
import { computed, ref } from 'vue'
import { orpc, queryClient } from './helpers'

beforeEach(() => {
  queryClient.clear()
})

describe('useQuery', () => {
  it('infer types correctly', async () => {
    const query = useQuery(orpc.user.find.queryOptions({
      input: { id: '123' },
    }))

    expectTypeOf(query.data.value).toEqualTypeOf<{ id: string, name: string } | undefined>()
  })

  it('support ref', () => {
    useQuery(orpc.user.find.queryOptions({ input: { id: ref('123') } }))
    useQuery(orpc.user.find.queryOptions({ input: computed(() => ({ id: ref('123') })) }))
  })

  it('strict on input', () => {
    // @ts-expect-error options is required since input is required
    useQuery(orpc.user.find.queryOptions())
    // @ts-expect-error input is required
    useQuery(orpc.user.find.queryOptions({}))
    // @ts-expect-error input is invalid
    useQuery(orpc.user.find.queryOptions({ input: { id: 123 } }))
  })

  it('infer types correctly with client context', async () => {
    useQuery(orpc.user.find.queryOptions({ input: { id: '123' } }))
    useQuery(orpc.user.find.queryOptions({ input: { id: '123' }, context: { batch: true } }))
    useQuery(orpc.user.find.queryOptions({ input: { id: '123' }, context: { batch: ref(false) } }))
    // @ts-expect-error --- invalid context
    useQuery(orpc.user.find.queryOptions({ input: { id: '123' }, context: { batch: 'invalid' } }))
    // @ts-expect-error --- invalid context
    useQuery(orpc.user.find.queryOptions({ input: { id: '123' }, context: { batch: ref('invalid') } }))
  })
})

describe('useMutation', () => {
  it('infer types correctly', async () => {
    const query = useMutation(orpc.user.find.mutationOptions({
      onSuccess(data) {
        expectTypeOf(data).toEqualTypeOf<{ id: string, name: string }>()
      },
    }))

    expectTypeOf(query.data.value).toEqualTypeOf<{ id: string, name: string } | undefined>()

    expectTypeOf(query.mutateAsync).toMatchTypeOf<(input: { id: string }) => Promise<{ id: string, name: string }>>()
  })

  it('infer types correctly with client context', async () => {
    useMutation(orpc.user.find.mutationOptions(({})))
    useMutation(orpc.user.find.mutationOptions(({ context: { batch: true } })))
    useMutation(orpc.user.find.mutationOptions(({ context: { batch: ref(false) } })))
    // @ts-expect-error --- invalid context
    useMutation(orpc.user.find.mutationOptions(({ context: { batch: 'invalid' } })))
    // @ts-expect-error --- invalid context
    useMutation(orpc.user.find.mutationOptions(({ context: { batch: ref('invalid') } })))
  })
})
