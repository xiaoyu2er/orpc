import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import { defineComponent, ref } from 'vue'
import { mount, orpc } from './helpers'

describe('useQuery', () => {
  it('works - onSuccess', async () => {
    const mounted = mount(defineComponent({
      setup() {
        const queryCache = useQueryCache()

        const query = useQuery(orpc.ping.queryOptions())

        return { query, queryCache }
      },
      template: '<div>{{ query?.data }}</div>',
    }))

    await vi.waitFor(() => expect(mounted.vm.query.data.value).toEqual('pong'))
    const data = mounted.vm.queryCache.getQueryData(orpc.ping.key())
    expect(data).toEqual('pong')

    mounted.vm.queryCache.invalidateQueries({ key: orpc.ping.key() })
    await vi.waitFor(() => expect(mounted.vm.query.isLoading.value).toEqual(true))
  })

  it('works - with ref', async () => {
    const mounted = mount(defineComponent({
      setup() {
        const id = ref('id-1')
        const query = useQuery(orpc.user.find.queryOptions({ input: { id } }))

        const setId = (value: string) => {
          id.value = value
        }

        return { setId, query }
      },
      template: '<div></div>',
    }))

    await vi.waitFor(() => expect(mounted.vm.query.data.value).toEqual({ id: 'id-1', name: 'name-id-1' }))
    mounted.vm.setId('id-2')
    await vi.waitFor(() => expect(mounted.vm.query.data.value).toEqual({ id: 'id-2', name: 'name-id-2' }))
  })

  it('works - onError', async () => {
    const mounted = mount(defineComponent({
      setup() {
        // @ts-expect-error -- invalid input
        const query = useQuery(orpc.user.create.queryOptions({ input: {} }))

        return { query }
      },
      template: '<div></div>',
    }))

    await vi.waitFor(() => expect(mounted.vm.query.error.value).toEqual(new Error('Input validation failed')))
  })
})

describe('useMutation', () => {
  it('works - onSuccess', async () => {
    const mounted = mount(defineComponent({
      setup() {
        const mutation = useMutation(orpc.ping.mutationOptions())

        return { mutation }
      },
      template: '<div></div>',
    }))

    mounted.vm.mutation.mutate()

    await vi.waitFor(() => expect(mounted.vm.mutation.isLoading.value).toEqual(true))
    await vi.waitFor(() => expect(mounted.vm.mutation.data.value).toEqual('pong'))
  })
})
