import { isDefinedError } from '@orpc/contract'
import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import { defineComponent, ref } from 'vue'
import { mount, orpc } from './helpers'

describe('useQuery', () => {
  it('on success', async () => {
    const mounted = mount(defineComponent({
      setup() {
        const id = ref('123')

        const queryCache = useQueryCache()
        const query = useQuery(orpc.post.find.queryOptions({ input: { id } }))

        const setId = (value: string) => {
          id.value = value
        }

        return { query, queryCache, setId }
      },
      template: '',
    }))

    await vi.waitFor(() => expect(mounted.vm.query.data.value).toEqual({ id: '123', title: 'title-123' }))
    expect(
      mounted.vm.queryCache.getQueryData(orpc.post.find.key({ input: { id: '123' } })),
    ).toEqual({ id: '123', title: 'title-123' })

    mounted.vm.setId('456')
    await vi.waitFor(() => expect(mounted.vm.query.data.value).toEqual({ id: '456', title: 'title-456' }))

    mounted.vm.queryCache.invalidateQueries({ key: orpc.post.create.key() })
    expect(mounted.vm.query.isLoading.value).toEqual(false)

    mounted.vm.queryCache.invalidateQueries({ key: orpc.post.key() })
    expect(mounted.vm.query.isLoading.value).toEqual(true)
  })

  it('on error', async () => {
    const mounted = mount(defineComponent({
      setup() {
        const query = useQuery(orpc.post.find.queryOptions({ input: { id: 'NOT_FOUND' } }))

        return { query }
      },
      template: '',
    }))

    await vi.waitFor(
      () => expect(mounted.vm.query.error.value).toSatisfy((e: any) => isDefinedError(e) && e.code === 'NOT_FOUND'),
    )
  })

  it('with client context', async () => {
    const mounted = mount(defineComponent({
      setup() {
        const query = useQuery(orpc.post.find.queryOptions({ input: { id: '123' }, context: { cache: 'force' } }))

        return { query }
      },
      template: '',
    }))

    await vi.waitFor(
      () => expect(mounted.vm.query.error.value).toSatisfy((e: any) => e.message === 'cache=force is not supported'),
    )
  })
})

describe('useMutation', () => {
  it('on success', async () => {
    const mounted = mount(defineComponent({
      setup() {
        const mutation = useMutation(orpc.post.create.mutationOptions())

        return { mutation }
      },
      template: '',
    }))

    // FIXME: problem with jsdom when upload file
    // mounted.vm.mutation.mutate({ title: 'title', thumbnail: new File(['hello'], 'hello.txt') })
    mounted.vm.mutation.mutate({ title: 'title' })

    // FIXME: problem with jsdom when upload file
    // await vi.waitFor(
    //   () => expect(mounted.vm.mutation.data.value).toEqual({ id: 'id-title', title: 'title', thumbnail: 'hello.txt' }),
    // )
    await vi.waitFor(
      () => expect(mounted.vm.mutation.data.value).toEqual({ id: 'id-title', title: 'title' }),
    )
  })

  it('on error', async () => {
    const mounted = mount(defineComponent({
      setup() {
        const mutation = useMutation(orpc.post.create.mutationOptions())

        return { mutation }
      },
      template: '',
    }))

    mounted.vm.mutation.mutate({ title: 'CONFLICT' })

    await vi.waitFor(
      () => expect(mounted.vm.mutation.error.value).toSatisfy((e: any) => isDefinedError(e) && e.code === 'CONFLICT'),
    )
  })

  it('with client context', async () => {
    const mounted = mount(defineComponent({
      setup() {
        const mutation = useMutation(orpc.post.create.mutationOptions({
          context: { cache: 'force' },
        }))

        return { mutation }
      },
      template: '',
    }))

    mounted.vm.mutation.mutate({ title: 'title' })

    await vi.waitFor(
      () => expect(mounted.vm.mutation.error.value).toSatisfy((e: any) => e.message === 'cache=force is not supported'),
    )
  })
})
