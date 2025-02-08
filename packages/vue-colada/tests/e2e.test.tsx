import { isDefinedError, ORPCError } from '@orpc/contract'
import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import { computed, defineComponent, ref } from 'vue'
import { pingHandler } from '../../server/tests/shared'
import { mount, orpc } from './shared'

it('case: with useQuery', async () => {
  const mounted = mount(defineComponent({
    setup() {
      const id = ref(123)

      const queryCache = useQueryCache()
      const query = useQuery(orpc.nested.ping.queryOptions({ input: computed(() => ({ input: id })) }))

      const setId = (value: number) => {
        id.value = value
      }

      return { query, queryCache, setId }
    },
    template: '',
  }))

  await vi.waitFor(() => expect(mounted.vm.query.data.value).toEqual({ output: '123' }))

  expect(
    mounted.vm.queryCache.getQueryData(orpc.nested.ping.key({ input: { input: 123 } })),
  ).toEqual({ output: '123' })

  mounted.vm.setId(456)

  await vi.waitFor(() => expect(mounted.vm.query.data.value).toEqual({ output: '456' }))

  mounted.vm.queryCache.invalidateQueries({ key: orpc.ping.key() })
  expect(mounted.vm.query.isLoading.value).toEqual(false)

  mounted.vm.queryCache.invalidateQueries({ key: orpc.nested.pong.key() })
  expect(mounted.vm.query.isLoading.value).toEqual(false)

  pingHandler.mockRejectedValue(new ORPCError('OVERRIDE'))

  mounted.vm.queryCache.invalidateQueries({ key: orpc.nested.key() })
  expect(mounted.vm.query.isLoading.value).toEqual(true)

  await vi.waitFor(() => {
    expect((mounted.vm.query as any).error.value).toBeInstanceOf(ORPCError)
    expect((mounted.vm.query as any).error.value).toSatisfy(isDefinedError)
    expect((mounted.vm.query as any).error.value.code).toEqual('OVERRIDE')
  })
})

it('case: with useMutation', async () => {
  const mounted = mount(defineComponent({
    setup() {
      const mutation = useMutation(orpc.nested.ping.mutationOptions())

      return { mutation }
    },
    template: '',
  }))

  mounted.vm.mutation.mutate({ input: 123 })

  await vi.waitFor(() => expect(mounted.vm.mutation.data.value).toEqual({ output: '123' }))

  pingHandler.mockRejectedValue(new ORPCError('OVERRIDE'))

  mounted.vm.mutation.mutate({ input: 456 })

  await vi.waitFor(() => {
    expect((mounted.vm.mutation as any).error.value).toBeInstanceOf(ORPCError)
    expect((mounted.vm.mutation as any).error.value).toSatisfy(isDefinedError)
    expect((mounted.vm.mutation as any).error.value.code).toEqual('OVERRIDE')
  })
})
