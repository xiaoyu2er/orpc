import { call, createRouterClient, isProcedure, ORPCError, unlazy } from '@orpc/server'
import { isAsyncIteratorObject } from '@orpc/shared'
import { inputSchema, outputSchema } from '../../contract/tests/shared'
import { trpcRouter } from '../tests/shared'
import { experimental_toORPCRouter as toORPCRouter } from './to-orpc-router'

describe('toORPCRouter', async () => {
  const orpcRouter = toORPCRouter(trpcRouter)

  it('shape', async () => {
    expect(orpcRouter.ping).toSatisfy(isProcedure)
    expect(orpcRouter.throw).toSatisfy(isProcedure)
    expect(orpcRouter.nested.ping).toSatisfy(isProcedure)

    const unlazy1 = await unlazy(orpcRouter.lazy)
    expect(unlazy1.default.subscribe).toSatisfy(isProcedure)

    const unlazy2 = await unlazy(unlazy1.default.lazy)

    expect(unlazy2.default.throw).toSatisfy(isProcedure)
  })

  it('with disabled input/output', async () => {
    expect((orpcRouter as any).ping['~orpc'].inputSchema['~standard'].vendor).toBe('zod')
    expect((orpcRouter as any).ping['~orpc'].inputSchema._def).toBe(inputSchema._def)
    expect((orpcRouter as any).ping['~orpc'].outputSchema['~standard'].vendor).toBe('zod')
    expect((orpcRouter as any).ping['~orpc'].outputSchema._def).toBe(outputSchema._def)

    const invalidValue = 'INVALID'
    expect((orpcRouter as any).ping['~orpc'].inputSchema['~standard'].validate(invalidValue)).toEqual({ value: invalidValue })
    expect((orpcRouter as any).ping['~orpc'].outputSchema['~standard'].validate(invalidValue)).toEqual({ value: invalidValue })
  })

  it('meta/route', async () => {
    expect(orpcRouter.ping['~orpc'].meta).toEqual({ meta1: 'test' })
    expect(orpcRouter.nested.ping['~orpc'].route).toEqual({ path: '/nested/ping', description: 'Nested ping procedure' })
    expect(orpcRouter.nested.ping['~orpc'].meta).toEqual({ path: '/nested/ping', description: 'Nested ping procedure' })
  })

  describe('calls', () => {
    it('on success', async () => {
      const result = await call(orpcRouter.ping, { input: 1234 }, { context: { a: 'test' } })
      expect(result).toEqual({ output: '1234' })
    })

    it('async iterator', async () => {
      const result = await call(orpcRouter.subscribe, { u: 'u' }, { context: { a: 'test' } })
      expect(result).toSatisfy(isAsyncIteratorObject)
      expect(await (result as any).next()).toEqual({ done: false, value: 'pong' })
    })

    it('error', async () => {
      await expect(
        call(orpcRouter.throw, { b: 42, c: 'test' }, { context: { a: 'test' } }),
      ).rejects.toSatisfy((err: any) => {
        return err instanceof ORPCError && err.code === 'PARSE_ERROR' && err.message === 'throw'
      })
    })

    it('deep lazy', async () => {
      const client = createRouterClient(orpcRouter, {
        context: { a: 'test' },
      })

      await expect(
        client.lazy.subscribe(),
      ).resolves.toSatisfy(isAsyncIteratorObject)

      await expect(
        client.lazy.lazy.throw({ input: 1234 }),
      ).rejects.toSatisfy((err: any) => {
        return err instanceof ORPCError && err.message === 'lazy.lazy.throw'
      })
    })
  })
})
