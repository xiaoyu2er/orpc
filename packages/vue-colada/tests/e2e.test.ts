import { useMutation, useQuery } from '@pinia/colada'
import { ref } from 'vue'
import { orpc } from './helpers'

describe('useQuery', () => {
  it('works - onSuccess', async () => {
    const query = useQuery(orpc.ping.queryOptions())

    expect(queryClient.isFetching({ queryKey: orpc.key() })).toEqual(1)
    expect(queryClient.isFetching({ queryKey: orpc.ping.key() })).toEqual(1)
    expect(queryClient.isFetching({ queryKey: orpc.ping.key({ }) })).toEqual(0)

    await vi.waitFor(() => expect(query.data.value).toEqual('pong'))

    expect(queryClient.getQueryData(orpc.ping.key({ type: 'query' }))).toEqual('pong')
  })

  it('works - with ref', async () => {
    const id = ref('id-1')

    const query = useQuery(orpc.user.find.queryOptions({
      input: ref({ id }),
    }), queryClient)

    await vi.waitFor(() => expect(query.data.value).toEqual({ id: 'id-1', name: 'name-id-1' }))

    id.value = 'id-2'

    await vi.waitFor(() => expect(query.data.value).toEqual({ id: 'id-2', name: 'name-id-2' }))
  })

  it('works - onError', async () => {
    // @ts-expect-error -- invalid input
    const query = useQuery(orpc.user.create.queryOptions({ input: {} }), queryClient)

    await vi.waitFor(() => expect(query.error.value).toEqual(new Error('Input validation failed')))

    expect(queryClient.getQueryData(orpc.ping.key({ type: 'query' }))).toEqual(undefined)
  })
})

describe('useMutation', () => {
  it('works - onSuccess', async () => {
    const query = useMutation(orpc.ping.mutationOptions(), queryClient)

    expect(queryClient.isFetching({ queryKey: orpc.ping.key({ type: 'mutation' }) })).toEqual(0)

    query.mutate({})

    expect(queryClient.isMutating({ mutationKey: orpc.ping.key() })).toEqual(1)
    expect(queryClient.isMutating({ mutationKey: orpc.ping.key({ type: 'mutation' }) })).toEqual(1)

    await vi.waitFor(() => expect(query.data.value).toEqual('pong'))
  })
})
