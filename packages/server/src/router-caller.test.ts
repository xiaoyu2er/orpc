import { ContractProcedure } from '@orpc/contract'
import { z } from 'zod'
import { lazy, unwrapLazy } from './lazy'
import { Procedure } from './procedure'
import { createProcedureCaller } from './procedure-caller'
import { createRouterCaller } from './router-caller'

vi.mock('./procedure-caller', () => ({
  createProcedureCaller: vi.fn(() => vi.fn(() => '__mocked__')),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createRouterCaller', () => {
  const schema = z.object({ val: z.string().transform(v => Number(v)) })
  const ping = new Procedure({
    contract: new ContractProcedure({
      InputSchema: schema,
      OutputSchema: schema,
    }),
    func: vi.fn(() => ({ val: '123' })),
  })
  const pong = new Procedure({
    contract: new ContractProcedure({
      InputSchema: undefined,
      OutputSchema: undefined,
    }),
    func: vi.fn(() => ('output')),
  })

  const router = {
    ping: lazy(() => Promise.resolve({ default: ping })),
    pong,
    nested: lazy(() => Promise.resolve({ default: {
      ping,
      pong: lazy(() => Promise.resolve({ default: pong })),
    } })),
  }

  const caller = createRouterCaller({
    router,
    context: { auth: true },
    path: ['users'],
  })

  it('works', () => {
    expect(caller.pong({ val: '123' })).toEqual('__mocked__')

    expect(createProcedureCaller).toBeCalledTimes(1)
    expect(createProcedureCaller).toBeCalledWith(expect.objectContaining({
      procedure: pong,
      context: { auth: true },
      path: ['users', 'pong'],
    }))

    expect(vi.mocked(createProcedureCaller).mock.results[0]?.value).toBeCalledTimes(1)
    expect(vi.mocked(createProcedureCaller).mock.results[0]?.value).toBeCalledWith({ val: '123' })
  })

  it('work with lazy', async () => {
    expect(caller.ping({ val: '123' })).toEqual('__mocked__')

    expect(createProcedureCaller).toBeCalledTimes(2)
    expect(createProcedureCaller).toHaveBeenNthCalledWith(2, expect.objectContaining({
      procedure: expect.any(Function),
      context: { auth: true },
      path: ['users', 'ping'],
    }))

    expect((await unwrapLazy(vi.mocked(createProcedureCaller as any).mock.calls[1]![0].procedure)).default).toBe(ping)

    expect(vi.mocked(createProcedureCaller).mock.results[1]?.value).toBeCalledTimes(1)
    expect(vi.mocked(createProcedureCaller).mock.results[1]?.value).toBeCalledWith({ val: '123' })
  })

  it('work with nested lazy', async () => {
    expect(caller.nested.ping({ val: '123' })).toEqual('__mocked__')

    expect(createProcedureCaller).toBeCalledTimes(5)
    expect(createProcedureCaller).toHaveBeenNthCalledWith(5, expect.objectContaining({
      procedure: expect.any(Function),
      context: { auth: true },
      path: ['users', 'nested', 'ping'],
    }))

    const lazied = vi.mocked(createProcedureCaller as any).mock.calls[4]![0].procedure
    expect(await unwrapLazy(lazied)).toEqual({ default: ping })

    expect(vi.mocked(createProcedureCaller).mock.results[4]?.value).toBeCalledTimes(1)
    expect(vi.mocked(createProcedureCaller).mock.results[4]?.value).toBeCalledWith({ val: '123' })
  })

  it('hooks', async () => {
    const onStart = vi.fn()
    const onSuccess = vi.fn()
    const onError = vi.fn()
    const onFinish = vi.fn()
    const execute = vi.fn()

    const caller = createRouterCaller({
      router,
      context: { auth: true },
      onStart,
      onSuccess,
      onError,
      onFinish,
      execute,
    })

    expect(caller.pong({ val: '123' })).toEqual('__mocked__')

    expect(createProcedureCaller).toBeCalledTimes(1)
    expect(createProcedureCaller).toHaveBeenCalledWith(expect.objectContaining({
      procedure: pong,
      context: { auth: true },
      path: ['pong'],
      onStart,
      onSuccess,
      onError,
      onFinish,
      execute,
    }))
  })

  it('not recursive on symbol', () => {
    expect((caller as any)[Symbol('something')]).toBeUndefined()
  })
})
