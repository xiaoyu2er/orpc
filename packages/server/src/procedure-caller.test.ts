import type { WELL_CONTEXT } from './types'
import { ContractProcedure } from '@orpc/contract'
import { z } from 'zod'
import { createLazy, isLazy, loadLazy } from './lazy'
import { Procedure } from './procedure'
import { createProcedureCaller } from './procedure-caller'

const schema = z.object({ val: z.string().transform(v => Number(v)) })

const func = vi.fn()
const mid = vi.fn()
const mid2 = vi.fn()

const procedure = new Procedure<WELL_CONTEXT, undefined, typeof schema, typeof schema, { val: string }>({
  contract: new ContractProcedure({
    InputSchema: schema,
    OutputSchema: schema,
  }),
  func,
})

const procedureWithMiddleware = new Procedure<{ userId?: string }, { db: string }, typeof schema, typeof schema, { val: string }>({
  contract: new ContractProcedure({
    InputSchema: schema,
    OutputSchema: schema,
  }),
  func,
  middlewares: [mid],
})

const procedureWithMultipleMiddleware = new Procedure<{ userId?: string }, { db: string }, typeof schema, typeof schema, { val: string }>({
  contract: new ContractProcedure({
    InputSchema: schema,
    OutputSchema: schema,
  }),
  func,
  middlewares: [mid, mid2],
})

const procedureCases = [
  [
    'default',
    procedure,
    procedureWithMiddleware,
    procedureWithMultipleMiddleware,
  ],
  [
    'lazy',
    createLazy(() => Promise.resolve({ default: procedure })),
    createLazy(() => Promise.resolve({ default: procedureWithMiddleware })),
    createLazy(() => Promise.resolve({ default: procedureWithMultipleMiddleware })),
  ],
] as const

beforeEach(() => {
  vi.resetAllMocks()
})

describe.each(procedureCases)('createProcedureCaller - %s', (_, procedure, procedureWithMiddleware, procedureWithMultipleMiddleware) => {
  const unwrapLazy = async (val: any) => {
    return isLazy(val) ? (await loadLazy(val)).default : val
  }

  it('just a caller', async () => {
    const caller = createProcedureCaller({
      procedure,
    })

    func.mockReturnValueOnce({ val: '123' })

    await expect(caller({ val: '123' })).resolves.toEqual({ val: 123 })

    expect(func).toHaveBeenCalledWith({ val: 123 }, undefined, { path: [], procedure: await unwrapLazy(procedure) })
  })

  it('validate input and output', () => {
    const caller = createProcedureCaller({
      procedure,
    })

    // @ts-expect-error - invalid input
    expect(caller({ val: 123 })).rejects.toThrow('Input validation failed')

    func.mockReturnValueOnce({ val: 1234 })
    expect(caller({ val: '1234' })).rejects.toThrow('Output validation failed')
  })

  it('middleware can return output directly - single', async () => {
    const caller = createProcedureCaller({
      procedure: procedureWithMiddleware,
      context: { userId: '123' },
    })

    mid.mockReturnValueOnce({ output: { val: '123' } })

    await expect(caller({ val: '123' })).resolves.toEqual({ val: 123 })

    expect(func).toBeCalledTimes(0)

    expect(mid).toBeCalledTimes(1)
    expect(mid).toHaveBeenCalledWith({ val: 123 }, { userId: '123' }, {
      path: [],
      procedure: await unwrapLazy(procedureWithMiddleware),
      next: expect.any(Function),
      output: expect.any(Function),
    })
  })

  it('middleware can return output directly - multiple', async () => {
    const caller = createProcedureCaller({
      procedure: procedureWithMultipleMiddleware,
      context: { userId: '123' },
    })

    mid.mockImplementationOnce((input, context, meta) => {
      return meta.next({
        context: {
          extra: '__extra__',
        },
      })
    })

    mid2.mockReturnValueOnce({ output: { val: '1234567' } })

    await expect(caller({ val: '123' })).resolves.toEqual({ val: 1234567 })

    expect(func).toBeCalledTimes(0)

    expect(mid).toBeCalledTimes(1)
    expect(mid).toHaveBeenCalledWith({ val: 123 }, { userId: '123' }, {
      path: [],
      procedure: await unwrapLazy(procedureWithMultipleMiddleware),
      next: expect.any(Function),
      output: expect.any(Function),
    })
    expect(mid).toReturnWith(Promise.resolve({ output: { val: '1234567' }, context: { extra: '__extra__' } }))

    expect(mid2).toBeCalledTimes(1)
    expect(mid2).toHaveBeenCalledWith({ val: 123 }, { userId: '123', extra: '__extra__' }, {
      path: [],
      procedure: await unwrapLazy(procedureWithMultipleMiddleware),
      next: expect.any(Function),
      output: expect.any(Function),
    })
  })

  it('output from middleware still be validated', async () => {
    const caller = createProcedureCaller({
      procedure: procedureWithMiddleware,
      context: { userId: '123' },
    })

    mid.mockReturnValueOnce({ output: { val: 1234 } })

    await expect(caller({ val: '1234' })).rejects.toThrow('Output validation failed')
  })

  it('middleware can add extra context - single', async () => {
    const caller = createProcedureCaller({
      procedure: procedureWithMiddleware,
      context: { userId: '123' },
    })

    mid.mockImplementationOnce((input, context, meta) => {
      return meta.next({
        context: {
          extra: '__extra__',
        },
      })
    })

    func.mockReturnValueOnce({ val: '1234' })

    await expect(caller({ val: '1234' })).resolves.toEqual({ val: 1234 })

    expect(func).toBeCalledTimes(1)
    expect(func).toHaveBeenCalledWith({ val: 1234 }, { userId: '123', extra: '__extra__' }, {
      path: [],
      procedure: await unwrapLazy(procedureWithMiddleware),
    })
  })

  it('middleware can add extra context - multiple', async () => {
    const caller = createProcedureCaller({
      procedure: procedureWithMultipleMiddleware,
      context: { userId: '123' },
    })

    mid.mockImplementationOnce((input, context, meta) => {
      return meta.next({
        context: {
          extra: '__extra__',
        },
      })
    })

    mid2.mockImplementationOnce((input, context, meta) => {
      return meta.next({
        context: {
          extra2: '__extra2__',
        },
      })
    })

    func.mockReturnValueOnce({ val: '1234' })

    await expect(caller({ val: '1234' })).resolves.toEqual({ val: 1234 })

    expect(func).toBeCalledTimes(1)
    expect(func).toHaveBeenCalledWith({ val: 1234 }, {
      userId: '123',
      extra: '__extra__',
      extra2: '__extra2__',
    }, {
      path: [],
      procedure: await unwrapLazy(procedureWithMultipleMiddleware),
    })
  })

  it('middleware can override context - signal', async () => {
    const caller = createProcedureCaller({
      procedure: procedureWithMiddleware,
      context: { userId: '123' },
    })

    mid.mockImplementationOnce((input, context, meta) => {
      return meta.next({
        context: {
          userId: '456',
        },
      })
    })

    func.mockReturnValueOnce({ val: '1234' })

    await expect(caller({ val: '1234' })).resolves.toEqual({ val: 1234 })

    expect(func).toBeCalledTimes(1)
    expect(func).toHaveBeenCalledWith({ val: 1234 }, { userId: '456' }, {
      path: [],
      procedure: await unwrapLazy(procedureWithMiddleware),
    })
  })

  it('middleware can override context - multiple', async () => {
    const caller = createProcedureCaller({
      procedure: procedureWithMultipleMiddleware,
      context: { userId: '123' },
    })

    mid.mockImplementationOnce((input, context, meta) => {
      return meta.next({
        context: {
          userId: '456',
          extra: '1',
        },
      })
    })

    mid2.mockImplementationOnce((input, context, meta) => {
      return meta.next({
        context: {
          userId: '789',
          extra: '2',
        },
      })
    })

    func.mockReturnValueOnce({ val: '1234' })

    await expect(caller({ val: '1234' })).resolves.toEqual({ val: 1234 })

    expect(func).toBeCalledTimes(1)
    expect(func).toHaveBeenCalledWith({ val: 1234 }, { userId: '789', extra: '2' }, {
      path: [],
      procedure: await unwrapLazy(procedureWithMultipleMiddleware),
    })
  })

  const contextCases = [
    ['directly value', { val: '__val__' }],
    ['sync function value', () => ({ val: '__val__' })],
    ['async function value', async () => ({ val: '__val__' })],
  ] as const

  it.each(contextCases)('can accept %s', async (_, context) => {
    func.mockReturnValue({ val: '1234' })

    const caller1 = createProcedureCaller({
      procedure,
      context,
    })

    await caller1({ val: '123' })
    expect(func).toBeCalledTimes(1)
    expect(func).toHaveBeenCalledWith({ val: 123 }, { val: '__val__' }, { path: [], procedure: await unwrapLazy(procedure) })
  })

  it.each(contextCases)('can accept hooks - context: %s', async (_, context) => {
    const execute = vi.fn()
    const onStart = vi.fn()
    const onSuccess = vi.fn()
    const onError = vi.fn()
    const onFinish = vi.fn()

    const caller = createProcedureCaller({
      procedure,
      context,
      path: ['users'],
      execute,
      onStart,
      onSuccess,
      onError,
      onFinish,
    })

    execute.mockImplementation((input, context, meta) => meta.next())
    func.mockReturnValueOnce({ val: '123' })

    await caller({ val: '123' })

    const meta = {
      path: ['users'],
      procedure: await unwrapLazy(procedure),
    }

    const contextValue = { val: '__val__' }

    expect(execute).toBeCalledTimes(1)
    expect(execute).toHaveBeenCalledWith({ val: '123' }, contextValue, {
      ...meta,
      next: expect.any(Function),
    })

    expect(onStart).toBeCalledTimes(1)
    expect(onStart).toHaveBeenCalledWith(
      { status: 'pending', input: { val: '123' }, output: undefined, error: undefined },
      contextValue,
      meta,
    )

    expect(onSuccess).toBeCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledWith(
      { status: 'success', input: { val: '123' }, output: { val: 123 }, error: undefined },
      contextValue,
      meta,
    )

    expect(onError).toBeCalledTimes(0)
  })

  it('accept paths', async () => {
    const onSuccess = vi.fn()
    const caller = createProcedureCaller({
      procedure,
      path: ['users'],
      onSuccess,
    })

    func.mockReturnValueOnce({ val: '123' })

    await caller({ val: '123' })

    expect(func).toBeCalledTimes(1)
    expect(func).toHaveBeenCalledWith({ val: 123 }, undefined, { path: ['users'], procedure: await unwrapLazy(procedure) })

    expect(onSuccess).toBeCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledWith(
      { status: 'success', input: { val: '123' }, output: { val: 123 }, error: undefined },
      undefined,
      { path: ['users'], procedure: await unwrapLazy(procedure) },
    )
  })
})

describe('createProcedure on invalid lazy procedure', () => {
  it('should throw error', () => {
    const lazy = createLazy(() => Promise.resolve({ default: 123 }))

    const caller = createProcedureCaller({
      // @ts-expect-error - invalid lazy procedure
      procedure: lazy,
    })

    expect(caller()).rejects.toThrow('Not found')
  })
})
