import type { ORPCError } from '@orpc/contract'
import { useMutation, useQuery } from '@pinia/colada'
import { ref } from 'vue'
import { orpc } from './helpers'

describe('useQuery', () => {
  it('infer input', async () => {
    useQuery(orpc.post.find.queryOptions({
      input: { id: '123' },
    }))

    useQuery(orpc.post.find.queryOptions({
      input: { id: ref('123') },
    }))

    // @ts-expect-error --- input is required
    useQuery(orpc.post.find.queryOptions({
    }))

    useQuery(orpc.post.find.queryOptions({
      // @ts-expect-error --- input is invalid
      input: { id: 123 },
    }))
  })

  it('infer output', () => {
    const query = useQuery(orpc.post.find.queryOptions({
      input: { id: '123' },
    }))

    expectTypeOf(query.data.value).toEqualTypeOf<undefined | { id: string, title: string, thumbnail?: string }>()
  })

  it('infer errors', () => {
    const query = useQuery(orpc.post.find.queryOptions({
      input: { id: '123' },
    }))

    expectTypeOf(query.error.value).toEqualTypeOf<Error | ORPCError<'NOT_FOUND', { id: string }> | null>()
  })

  it('infer client context', () => {
    useQuery(orpc.post.find.queryOptions({
      input: { id: '123' },
      context: { cache: 'force' },
    }))

    useQuery(orpc.post.find.queryOptions({
      input: { id: '123' },
      context: { cache: ref('force') },
    }))

    useQuery(orpc.post.find.queryOptions({
      input: { id: '123' },
      context: ref({ cache: ref('force') }),
    }))

    useQuery(orpc.post.find.queryOptions({
      input: { id: '123' },
      // @ts-expect-error --- invalid context
      context: { cache: 123 },
    }))
  })
})

describe('useMutation', () => {
  it('infer input', async () => {
    const mutation = useMutation(orpc.post.create.mutationOptions({
      onMutate(input) {
        expectTypeOf(input).toEqualTypeOf<{ title: string, thumbnail?: File }>()
      },
    }))

    mutation.mutate({ title: 'title' })
    mutation.mutate({ title: 'title', thumbnail: new File([], 'thumbnail.png') })

    // @ts-expect-error --- invalid input
    mutation.mutate({ title: 123 })
    // @ts-expect-error --- invalid input
    mutation.mutate({ title: 'title', thumbnail: 124 })
  })

  it('infer output', async () => {
    const mutation = useMutation(orpc.post.create.mutationOptions({
      onSuccess(data) {
        expectTypeOf(data).toEqualTypeOf<{ id: string, title: string, thumbnail?: string }>()
      },
    }))

    expectTypeOf(await mutation.mutateAsync({ title: '123' })).toEqualTypeOf<{ id: string, title: string, thumbnail?: string }>()
  })

  it('infer errors', () => {
    const mutation = useMutation(orpc.post.create.mutationOptions({
      onError(error) {
        expectTypeOf(error).toEqualTypeOf<
          | Error
          | ORPCError<'CONFLICT', { title: string, thumbnail?: File }>
          | ORPCError<'FORBIDDEN', { title: string, thumbnail?: File }>
        >()
      },
    }))

    expectTypeOf(mutation.error.value).toEqualTypeOf<
      | null
      | Error
      | ORPCError<'CONFLICT', { title: string, thumbnail?: File }>
      | ORPCError<'FORBIDDEN', { title: string, thumbnail?: File }>
    >()
  })

  it('infer client context', () => {
    useMutation(orpc.post.create.mutationOptions({
      context: { cache: '1234' },
    }))

    useMutation(orpc.post.create.mutationOptions({
      context: { cache: ref('1234') },
    }))

    // @ts-expect-error --- invalid context
    useMutation(orpc.post.create.mutationOptions({
      context: { cache: 1234 },
    }))
  })
})
