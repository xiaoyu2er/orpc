import { queryClient } from '../tests/shared'
import { experimental_serializableStreamedQuery as streamedQuery } from './stream-query'

beforeEach(() => {
  queryClient.clear()
})

describe('streamedQuery', () => {
  it('works with basic streaming', async () => {
    const queryFn = streamedQuery(async function* () {
      yield 'chunk1'
      await new Promise(resolve => setTimeout(resolve, 50))
      yield 'chunk2'
      await new Promise(resolve => setTimeout(resolve, 50))
      yield 'chunk3'
    })

    const controller = new AbortController()

    const resultPromise = expect(queryFn({
      queryKey: ['stream-query'],
      signal: controller.signal,
      client: queryClient,
    } as any)).resolves.toEqual(['chunk1', 'chunk2', 'chunk3'])

    await vi.waitFor(() => {
      expect(queryClient.getQueryData(['stream-query'])).toEqual(['chunk1'])
    })

    await vi.waitFor(() => {
      expect(queryClient.getQueryData(['stream-query'])).toEqual(['chunk1', 'chunk2'])
    })

    await resultPromise
  })

  it('works with reset refetch mode (default)', async () => {
    // First query
    const queryFn1 = streamedQuery(async function* () {
      yield 'initial1'
      yield 'initial2'
    })

    await queryFn1({
      queryKey: ['refetch-test'],
      signal: new AbortController().signal,
      client: queryClient,
    } as any)

    expect(queryClient.getQueryData(['refetch-test'])).toEqual(['initial1', 'initial2'])

    // Refetch with reset mode (default)
    const queryFn2 = streamedQuery(async function* () {
      yield 'refetch1'
      await new Promise(resolve => setTimeout(resolve, 50))
      yield 'refetch2'
    }, { refetchMode: 'reset' })

    const resultPromise = expect(queryFn2({
      queryKey: ['refetch-test'],
      signal: new AbortController().signal,
      client: queryClient,
    } as any)).resolves.toEqual(['refetch1', 'refetch2'])

    // Should reset to undefined during refetch
    await vi.waitFor(() => {
      const data = queryClient.getQueryData(['refetch-test'])
      expect(data).toBeUndefined()
    })

    await vi.waitFor(() => {
      expect(queryClient.getQueryData(['refetch-test'])).toEqual(['refetch1'])
    })

    await resultPromise
  })

  it('works with append refetch mode', async () => {
    // First query
    const queryFn1 = streamedQuery(async function* () {
      yield 'initial1'
      yield 'initial2'
    })

    await queryFn1({
      queryKey: ['append-test'],
      signal: new AbortController().signal,
      client: queryClient,
    } as any)

    expect(queryClient.getQueryData(['append-test'])).toEqual(['initial1', 'initial2'])

    // Refetch with append mode
    const queryFn2 = streamedQuery(async function* () {
      yield 'append1'
      await new Promise(resolve => setTimeout(resolve, 50))
      yield 'append2'
    }, { refetchMode: 'append' })

    const resultPromise = expect(queryFn2({
      queryKey: ['append-test'],
      signal: new AbortController().signal,
      client: queryClient,
    } as any)).resolves.toEqual(['initial1', 'initial2', 'append1', 'append2'])

    await vi.waitFor(() => {
      expect(queryClient.getQueryData(['append-test'])).toEqual(['initial1', 'initial2', 'append1'])
    })

    await vi.waitFor(() => {
      expect(queryClient.getQueryData(['append-test'])).toEqual(['initial1', 'initial2', 'append1', 'append2'])
    })

    await resultPromise
  })

  it('works with replace refetch mode', async () => {
    // First query
    const queryFn1 = streamedQuery(async function* () {
      yield 'initial1'
      yield 'initial2'
    })

    await queryFn1({
      queryKey: ['replace-test'],
      signal: new AbortController().signal,
      client: queryClient,
    } as any)

    expect(queryClient.getQueryData(['replace-test'])).toEqual(['initial1', 'initial2'])

    // Refetch with replace mode
    const queryFn2 = streamedQuery(async function* () {
      yield 'replace1'
      await new Promise(resolve => setTimeout(resolve, 50))
      yield 'replace2'
    }, { refetchMode: 'replace' })

    const resultPromise = expect(queryFn2({
      queryKey: ['replace-test'],
      signal: new AbortController().signal,
      client: queryClient,
    } as any)).resolves.toEqual(['replace1', 'replace2'])

    // Data should remain unchanged during streaming
    await new Promise(resolve => setTimeout(resolve, 25))
    expect(queryClient.getQueryData(['replace-test'])).toEqual(['initial1', 'initial2'])

    // Only replaced after stream completes
    await resultPromise
    expect(queryClient.getQueryData(['replace-test'])).toEqual(['replace1', 'replace2'])
  })

  it('works with maxChunks limit', async () => {
    const queryFn = streamedQuery(async function* () {
      yield 'chunk1'
      await new Promise(resolve => setTimeout(resolve, 50))
      yield 'chunk2'
      await new Promise(resolve => setTimeout(resolve, 50))
      yield 'chunk3'
      await new Promise(resolve => setTimeout(resolve, 50))
      yield 'chunk4'
    }, { maxChunks: 2 })

    const controller = new AbortController()

    const resultPromise = expect(queryFn({
      queryKey: ['max-chunks-test'],
      signal: controller.signal,
      client: queryClient,
    } as any)).resolves.toEqual(['chunk3', 'chunk4'])

    await vi.waitFor(() => {
      expect(queryClient.getQueryData(['max-chunks-test'])).toEqual(['chunk1'])
    })

    await vi.waitFor(() => {
      expect(queryClient.getQueryData(['max-chunks-test'])).toEqual(['chunk1', 'chunk2'])
    })

    await vi.waitFor(() => {
      expect(queryClient.getQueryData(['max-chunks-test'])).toEqual(['chunk2', 'chunk3'])
    })

    await resultPromise
  })

  it('works with maxChunks and append refetch mode', async () => {
    // First query
    const queryFn1 = streamedQuery(async function* () {
      yield 'initial1'
      yield 'initial2'
    }, { maxChunks: 3 })

    await queryFn1({
      queryKey: ['max-chunks-append-test'],
      signal: new AbortController().signal,
      client: queryClient,
    } as any)

    expect(queryClient.getQueryData(['max-chunks-append-test'])).toEqual(['initial1', 'initial2'])

    // Refetch with append mode and maxChunks
    const queryFn2 = streamedQuery(async function* () {
      yield 'append1'
      await new Promise(resolve => setTimeout(resolve, 50))
      yield 'append2'
    }, { refetchMode: 'append', maxChunks: 3 })

    const resultPromise = expect(queryFn2({
      queryKey: ['max-chunks-append-test'],
      signal: new AbortController().signal,
      client: queryClient,
    } as any)).resolves.toEqual(['initial2', 'append1', 'append2'])

    vi.waitFor(() => {
      expect(queryClient.getQueryData(['max-chunks-append-test'])).toEqual(['initial1', 'initial2', 'append1'])
    })

    await resultPromise
    expect(queryClient.getQueryData(['max-chunks-append-test'])).toEqual(['initial2', 'append1', 'append2'])
  })

  it('handles abort signal during streaming', async () => {
    let cleanupCalled = false
    const yieldFn = vi.fn(v => v)
    const queryFn = streamedQuery(async function* () {
      try {
        yield yieldFn('chunk1')
        await new Promise(resolve => setTimeout(resolve, 50))
        yield yieldFn('chunk2')
        await new Promise(resolve => setTimeout(resolve, 50))
        yield yieldFn('chunk3')
      }
      finally {
        cleanupCalled = true
      }
    })

    const controller = new AbortController()

    const resultPromise = expect(queryFn({
      queryKey: ['abort-test'],
      signal: controller.signal,
      client: queryClient,
    } as any)).resolves.toEqual(['chunk1'])

    await vi.waitFor(() => {
      expect(queryClient.getQueryData(['abort-test'])).toEqual(['chunk1'])
    })

    controller.abort()

    await resultPromise
    expect(cleanupCalled).toBe(true)
    expect(yieldFn).toHaveBeenCalledTimes(2)
  })

  it('handles abort signal with replace refetch mode', async () => {
    // First query
    const queryFn1 = streamedQuery(async function* () {
      yield 'initial1'
      yield 'initial2'
    })

    await queryFn1({
      queryKey: ['abort-replace-test'],
      signal: new AbortController().signal,
      client: queryClient,
    } as any)

    expect(queryClient.getQueryData(['abort-replace-test'])).toEqual(['initial1', 'initial2'])

    // Refetch with replace mode and abort
    const queryFn2 = streamedQuery(async function* () {
      yield 'replace1'
      await new Promise(resolve => setTimeout(resolve, 50))
      yield 'replace2'
    }, { refetchMode: 'replace' })

    const controller = new AbortController()

    const resultPromise = expect(queryFn2({
      queryKey: ['abort-replace-test'],
      signal: controller.signal,
      client: queryClient,
    } as any)).resolves.toEqual(['initial1', 'initial2'])

    await new Promise(resolve => setTimeout(resolve, 25))
    controller.abort()

    await resultPromise

    // Should not replace cache when aborted
    expect(queryClient.getQueryData(['abort-replace-test'])).toEqual(['initial1', 'initial2'])
  })

  it('handles empty stream', async () => {
    const queryFn = streamedQuery(async function* () {
      // Empty generator
    })

    const result = await queryFn({
      queryKey: ['empty-stream'],
      signal: new AbortController().signal,
      client: queryClient,
    } as any)

    expect(result).toEqual([])
  })

  it('handles async iterable from promise', async () => {
    const queryFn = streamedQuery(async (context) => {
      return (async function* () {
        yield `chunk1-${context.queryKey[1]}`
        await new Promise(resolve => setTimeout(resolve, 50))
        yield `chunk2-${context.queryKey[1]}`
      })()
    })

    const result = await queryFn({
      queryKey: ['promise-stream', 'test'],
      signal: new AbortController().signal,
      client: queryClient,
    } as any)

    expect(result).toEqual(['chunk1-test', 'chunk2-test'])
  })

  it('handles error in stream', async () => {
    const queryFn = streamedQuery(async function* () {
      yield 'chunk1'
      await new Promise(resolve => setTimeout(resolve, 50))
      throw new Error('Stream error')
    })

    await expect(queryFn({
      queryKey: ['error-stream'],
      signal: new AbortController().signal,
      client: queryClient,
    } as any)).rejects.toThrow('Stream error')

    // Should still have the chunk that was yielded before error
    expect(queryClient.getQueryData(['error-stream'])).toEqual(['chunk1'])
  })

  it('handles maxChunks with value Infinite (unlimited)', async () => {
    const queryFn = streamedQuery(async function* () {
      yield 'chunk1'
      yield 'chunk2'
      yield 'chunk3'
      yield 'chunk4'
      yield 'chunk5'
    }, { maxChunks: Number.POSITIVE_INFINITY })

    const result = await queryFn({
      queryKey: ['unlimited-chunks'],
      signal: new AbortController().signal,
      client: queryClient,
    } as any)

    expect(result).toEqual(['chunk1', 'chunk2', 'chunk3', 'chunk4', 'chunk5'])
    expect(queryClient.getQueryData(['unlimited-chunks'])).toEqual(['chunk1', 'chunk2', 'chunk3', 'chunk4', 'chunk5'])
  })

  it('handles first-time query vs refetch correctly', async () => {
    const queryFn = streamedQuery(async function* () {
      yield 'chunk1'
      yield 'chunk2'
    }, { refetchMode: 'reset' })

    // First time - should not reset since there's no existing data
    const result1 = await queryFn({
      queryKey: ['first-vs-refetch'],
      signal: new AbortController().signal,
      client: queryClient,
    } as any)

    expect(result1).toEqual(['chunk1', 'chunk2'])

    // Second time - should reset since there's existing data
    const resultPromise = expect(queryFn({
      queryKey: ['first-vs-refetch'],
      signal: new AbortController().signal,
      client: queryClient,
    } as any)).resolves.toEqual(['chunk1', 'chunk2'])

    // Should be reset to undefined during refetch
    await vi.waitFor(() => {
      const data = queryClient.getQueryData(['first-vs-refetch'])
      expect(data).toBeUndefined()
    })

    await resultPromise
  })
})
