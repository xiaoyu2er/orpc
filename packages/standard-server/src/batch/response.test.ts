import type { BatchResponseBodyItem } from './response'
import { isAsyncIteratorObject } from '@orpc/shared'
import { parseBatchResponse, toBatchResponse } from './response'

describe.each(['streaming', 'buffered'] as const)('toBatchResponse & parseBatchResponse with %s mode', (mode) => {
  const r1: BatchResponseBodyItem = { index: 0, status: 200, headers: { }, body: 'test1' }
  const r2: BatchResponseBodyItem = { index: 1, status: 207, headers: { 'x-custom': 'value2' }, body: 'test2' }

  it('success', async () => {
    const response = await toBatchResponse({
      mode,
      status: 207,
      headers: { 'x-custom': 'value' },
      body: (async function* () {
        yield r1
        yield r2
      })(),
    })

    expect(response.status).toEqual(207)
    expect(response.headers).toEqual({ 'x-custom': 'value' })

    const parsed = parseBatchResponse(response)

    expect(parsed).toSatisfy(isAsyncIteratorObject)

    await expect(parsed.next()).resolves.toEqual({ done: false, value: r1 })
    await expect(parsed.next()).resolves.toEqual({ done: false, value: r2 })
    await expect(parsed.next()).resolves.toEqual({ done: true, value: undefined })
  })
})

describe('toBatchResponse', () => {
  it('use streaming mode by default', async () => {
    const response = await toBatchResponse({
      status: 207,
      headers: { 'x-custom': 'value' },
      body: (async function* () {})(),
    })

    expect(response.body).toSatisfy(isAsyncIteratorObject)
  })

  it('on buffered mode error', async () => {
    await expect(
      toBatchResponse({
        mode: 'buffered',
        status: 207,
        headers: { 'x-custom': 'value' },
        body: (async function* () {
          yield { index: 0, status: 200, headers: { 'x-custom': 'value' }, body: 'yielded1' }
          throw new Error('__TEST__')
        })(),
      }),
    ).rejects.toThrow('__TEST__')
  })
})

describe('parseBatchResponse', () => {
  it('throw on invalid batch body', () => {
    expect(
      () => parseBatchResponse({ status: 207, headers: { 'x-custom': 'value' }, body: undefined }),
    ).toThrow('Invalid batch response')

    expect(
      () => parseBatchResponse({ status: 207, headers: { 'x-custom': 'value' }, body: '123' }),
    ).toThrow('Invalid batch response')
  })

  it.each(['streaming', 'buffered'] as const)('throw on invalid batch body with %s mode', async (mode) => {
    const parsed = parseBatchResponse(await toBatchResponse({
      mode,
      status: 207,
      headers: { 'x-custom': 'value' },
      body: (async function* () {
        yield { headers: {} } as any
      })(),
    }))

    await expect(parsed.next()).rejects.toThrow('Invalid batch response')
  })
})
