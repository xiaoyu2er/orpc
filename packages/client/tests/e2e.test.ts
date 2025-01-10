import { ORPCError, safe } from '@orpc/contract'
import { orpc } from './helpers'

describe('e2e', () => {
  it('on success', () => {
    expect(
      orpc.post.find({ id: '1' }),
    ).resolves.toEqual({ id: '1', title: 'title-1' })

    expect(
      orpc.post.create({ title: 'new-title', thumbnail: new File(['hello'], 'hello.txt') }),
    ).resolves.toEqual({ id: 'id-new-title', title: 'new-title', thumbnail: 'hello.txt' })
  })

  it('on error', async () => {
    const [, error] = await safe(orpc.post.find({ id: 'NOT_FOUND' }))

    expect(error).toBeInstanceOf(ORPCError)
    expect((error as any).data).toEqual({ id: 'NOT_FOUND' })

    const [, error2] = await safe(orpc.post.create({ title: 'CONFLICT' }))

    expect(error2).toBeInstanceOf(ORPCError)
    expect((error2 as any).data).toEqual({ title: 'CONFLICT' })

    // @ts-expect-error - invalid input
    const [, error3] = await safe(orpc.post.create({ }))

    expect(error3).toBeInstanceOf(ORPCError)
    expect((error3 as any).code).toEqual('BAD_REQUEST')
    expect((error3 as any).data).toEqual({
      issues: [{
        code: 'invalid_type',
        expected: 'string',
        message: 'Required',
        path: ['title'],
        received: 'undefined',
      }],
    })
  })

  it('with client context', async () => {
    expect(
      orpc.post.find({ id: '1' }, { context: { cache: 'force' } }),
    ).rejects.toThrow('cache=force is not supported')
  })
})
