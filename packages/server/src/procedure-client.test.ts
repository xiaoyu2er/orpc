import { ContractProcedure, ORPCError, validateORPCError } from '@orpc/contract'
import { z } from 'zod'
import { createORPCErrorConstructorMap } from './error'
import { isLazy, lazy, unlazy } from './lazy'
import { Procedure } from './procedure'
import { createProcedureClient } from './procedure-client'

vi.mock('@orpc/contract', async origin => ({
  ...await origin(),
  validateORPCError: vi.fn(),
}))

vi.mock('./error', async origin => ({
  ...await origin(),
  createORPCErrorConstructorMap: vi.fn(),
}))

// this transform ensure workflow is correct preMiddlewares <-> validation <-> postMiddlewares <-> handler
const schema = z.object({ val: z.string().transform(v => Number(v)) })

const handler = vi.fn(() => ({ val: '123' }))
const preMid1 = vi.fn(({ next }, input, output) => next({}))
const preMid2 = vi.fn(({ next }, input, output) => next({}))

const postMid1 = vi.fn(({ next }, input, output) => next({}))
const postMid2 = vi.fn(({ next }, input, output) => next({}))

const baseErrors = {
  BAD_REQUEST: {
    data: z.object({ why: z.string().transform(v => Number(v)) }),
  },
}

const procedure = new Procedure({
  contract: new ContractProcedure({
    InputSchema: schema,
    OutputSchema: schema,
    errorMap: baseErrors,
  }),
  handler,
  middlewares: [preMid1, preMid2, postMid1, postMid2],
  inputValidationIndex: 2,
  outputValidationIndex: 2,
})

const procedureCases = [
  ['without lazy', procedure],
  ['with lazy', lazy(() => Promise.resolve({ default: procedure }))],
] as const

beforeEach(() => {
  vi.clearAllMocks()
})

describe.each(procedureCases)('createProcedureClient - case %s', async (_, procedure) => {
  const unwrappedProcedure = isLazy(procedure) ? (await unlazy(procedure)).default : procedure

  it('just a client', async () => {
    const client = createProcedureClient(procedure)

    vi.mocked(createORPCErrorConstructorMap).mockReturnValueOnce('__constructors__' as any)

    await expect(client({ val: '123' })).resolves.toEqual({ val: 123 })

    expect(createORPCErrorConstructorMap).toBeCalledTimes(1)
    expect(createORPCErrorConstructorMap).toBeCalledWith(baseErrors)

    expect(handler).toBeCalledTimes(1)
    expect(handler).toBeCalledWith({
      input: { val: 123 },
      context: undefined,
      path: [],
      procedure: unwrappedProcedure,
      errors: '__constructors__',
    })

    expect(preMid1).toBeCalledTimes(1)
    expect(preMid1).toBeCalledWith(expect.objectContaining({
      path: [],
      procedure: unwrappedProcedure,
      next: expect.any(Function),
      context: undefined,
      errors: '__constructors__',
    }), { val: '123' }, expect.any(Function))

    expect(preMid2).toBeCalledTimes(1)
    expect(preMid2).toBeCalledWith(expect.objectContaining({
      path: [],
      procedure: unwrappedProcedure,
      next: expect.any(Function),
      context: undefined,
      errors: '__constructors__',
    }), { val: '123' }, expect.any(Function))

    expect(postMid1).toBeCalledTimes(1)
    expect(postMid1).toBeCalledWith(expect.objectContaining({
      path: [],
      procedure: unwrappedProcedure,
      next: expect.any(Function),
      context: undefined,
      errors: '__constructors__',
    }), { val: 123 }, expect.any(Function))

    expect(postMid2).toBeCalledTimes(1)
    expect(postMid2).toBeCalledWith(expect.objectContaining({
      path: [],
      procedure: unwrappedProcedure,
      next: expect.any(Function),
      context: undefined,
      errors: '__constructors__',
    }), { val: 123 }, expect.any(Function))
  })

  it('validate input and output', () => {
    const client = createProcedureClient(procedure)

    // @ts-expect-error - invalid input
    expect(client({ val: 123 })).rejects.toThrow('Input validation failed')

    // @ts-expect-error - invalid output
    handler.mockReturnValueOnce({ val: 1234 })
    expect(client({ val: '1234' })).rejects.toThrow('Output validation failed')
  })

  it('middleware can return output directly', async () => {
    const client = createProcedureClient(procedure)

    preMid1.mockReturnValueOnce({ output: { val: 990 } })
    await expect(client({ val: '123' })).resolves.toEqual({ val: 990 })
    expect(preMid1).toBeCalledTimes(1)
    expect(preMid2).toBeCalledTimes(0)
    expect(postMid1).toBeCalledTimes(0)
    expect(postMid2).toBeCalledTimes(0)
    expect(handler).toBeCalledTimes(0)

    vi.clearAllMocks()
    preMid2.mockReturnValueOnce({ output: { val: 9900 } })
    await expect(client({ val: '123' })).resolves.toEqual({ val: 9900 })
    expect(preMid1).toBeCalledTimes(1)
    expect(preMid2).toBeCalledTimes(1)
    expect(postMid1).toBeCalledTimes(0)
    expect(postMid2).toBeCalledTimes(0)
    expect(handler).toBeCalledTimes(0)
    expect(preMid1).toReturnWith(Promise.resolve({ output: { val: '9900' }, context: undefined }))

    vi.clearAllMocks()
    postMid1.mockReturnValueOnce({ output: { val: '9900' } })
    await expect(client({ val: '123' })).resolves.toEqual({ val: 9900 })
    expect(preMid1).toBeCalledTimes(1)
    expect(preMid2).toBeCalledTimes(1)
    expect(postMid1).toBeCalledTimes(1)
    expect(postMid2).toBeCalledTimes(0)
    expect(handler).toBeCalledTimes(0)
    expect(preMid1).toReturnWith(Promise.resolve({ output: { val: 9900 }, context: undefined }))
    expect(preMid2).toReturnWith(Promise.resolve({ output: { val: 9900 }, context: undefined }))

    vi.clearAllMocks()
    postMid2.mockReturnValueOnce({ output: { val: '9900' } })
    await expect(client({ val: '123' })).resolves.toEqual({ val: 9900 })
    expect(preMid1).toBeCalledTimes(1)
    expect(preMid2).toBeCalledTimes(1)
    expect(postMid1).toBeCalledTimes(1)
    expect(postMid2).toBeCalledTimes(1)
    expect(handler).toBeCalledTimes(0)
    expect(preMid1).toReturnWith(Promise.resolve({ output: { val: 9900 }, context: undefined }))
    expect(preMid2).toReturnWith(Promise.resolve({ output: { val: 9900 }, context: undefined }))
    expect(postMid1).toReturnWith(Promise.resolve({ output: { val: '9900' }, context: undefined }))
  })

  it('middleware can add extra context', async () => {
    const client = createProcedureClient(procedure)

    preMid1.mockImplementationOnce(({ next }) => {
      return next({
        context: {
          extra1: '__extra1__',
        },
      })
    })

    preMid2.mockImplementationOnce(({ next }) => {
      return next({
        context: {
          extra2: '__extra2__',
        },
      })
    })

    postMid1.mockImplementationOnce(({ next }) => {
      return next({
        context: {
          extra3: '__extra3__',
        },
      })
    })

    postMid2.mockImplementationOnce(({ next }) => {
      return next({
        context: {
          extra4: '__extra4__',
        },
      })
    })

    await expect(client({ val: '123' })).resolves.toEqual({ val: 123 })

    expect(preMid1).toBeCalledTimes(1)
    expect(preMid1).toHaveBeenCalledWith(expect.objectContaining({ context: undefined }), expect.any(Object), expect.any(Function))

    expect(preMid2).toBeCalledTimes(1)
    expect(preMid2).toHaveBeenCalledWith(expect.objectContaining({
      context: { extra1: '__extra1__' },
    }), expect.any(Object), expect.any(Function))

    expect(postMid1).toBeCalledTimes(1)
    expect(postMid1).toHaveBeenCalledWith(expect.objectContaining({
      context: {
        extra1: '__extra1__',
        extra2: '__extra2__',
      },
    }), expect.any(Object), expect.any(Function))

    expect(postMid2).toBeCalledTimes(1)
    expect(postMid2).toHaveBeenCalledWith(expect.objectContaining({
      context: {
        extra1: '__extra1__',
        extra2: '__extra2__',
        extra3: '__extra3__',
      },
    }), expect.any(Object), expect.any(Function))

    expect(handler).toBeCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ context: {
      extra1: '__extra1__',
      extra2: '__extra2__',
      extra3: '__extra3__',
      extra4: '__extra4__',
    } }))
  })

  it('middleware can override context', async () => {
    const client = createProcedureClient(procedure, {
      context: { userId: '123' },
    })

    preMid1.mockImplementationOnce(({ next }) => {
      return next({
        context: {
          userId: '__override1__',
        },
      })
    })

    preMid2.mockImplementationOnce(({ next }) => {
      return next({
        context: {
          userId: '__override2__',
        },
      })
    })

    postMid1.mockImplementationOnce(({ next }) => {
      return next({
        context: {
          userId: '__override3__',
        },
      })
    })

    postMid2.mockImplementationOnce(({ next }) => {
      return next({
        context: {
          userId: '__override4__',
        },
      })
    })

    await expect(client({ val: '123' })).resolves.toEqual({ val: 123 })

    expect(preMid1).toBeCalledTimes(1)
    expect(preMid1).toHaveBeenCalledWith(expect.objectContaining({
      context: expect.objectContaining({ userId: '123' }),
    }), expect.any(Object), expect.any(Function))

    expect(preMid2).toBeCalledTimes(1)
    expect(preMid2).toHaveBeenCalledWith(expect.objectContaining({
      context: expect.objectContaining({ userId: '__override1__' }),
    }), expect.any(Object), expect.any(Function))

    expect(postMid1).toBeCalledTimes(1)
    expect(postMid1).toHaveBeenCalledWith(expect.objectContaining({
      context: expect.objectContaining({ userId: '__override2__' }),
    }), expect.any(Object), expect.any(Function))

    expect(postMid2).toBeCalledTimes(1)
    expect(postMid2).toHaveBeenCalledWith(expect.objectContaining({
      context: expect.objectContaining({ userId: '__override3__' }),
    }), expect.any(Object), expect.any(Function))

    expect(handler).toBeCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ context: expect.objectContaining({ userId: '__override4__' }) }))
  })

  const contextCases = [
    ['directly value', { val: '__val__' }],
    ['sync function value', () => ({ val: '__val__' })],
    ['async function value', async () => ({ val: '__val__' })],
  ] as const

  it.each(contextCases)('can accept context: %s', async (_, context) => {
    const client = createProcedureClient(procedure, {
      context,
    })

    await client({ val: '123' })

    expect(preMid1).toBeCalledTimes(1)
    expect(preMid1).toBeCalledWith(
      expect.objectContaining({ context: { val: '__val__' } }),
      expect.any(Object),
      expect.any(Function),
    )

    expect(preMid2).toBeCalledTimes(1)
    expect(preMid2).toBeCalledWith(
      expect.objectContaining({ context: { val: '__val__' } }),
      expect.any(Object),
      expect.any(Function),
    )

    expect(postMid1).toBeCalledTimes(1)
    expect(postMid1).toBeCalledWith(
      expect.objectContaining({ context: { val: '__val__' } }),
      expect.any(Object),
      expect.any(Function),
    )

    expect(postMid2).toBeCalledTimes(1)
    expect(postMid2).toBeCalledWith(
      expect.objectContaining({ context: { val: '__val__' } }),
      expect.any(Object),
      expect.any(Function),
    )

    expect(handler).toBeCalledTimes(1)
    expect(handler).toBeCalledWith(expect.objectContaining({ context: { val: '__val__' } }))
  })

  it.each(contextCases)('can accept hooks - context: %s', async (_, context) => {
    const execute = vi.fn((input, context, meta) => meta.next())
    const onStart = vi.fn()
    const onSuccess = vi.fn()
    const onError = vi.fn()
    const onFinish = vi.fn()

    const client = createProcedureClient(procedure, {
      context,
      path: ['users'],
      interceptor: execute,
      onStart,
      onSuccess,
      onError,
      onFinish,
    })

    await client({ val: '123' })

    const meta = {
      path: ['users'],
      procedure: unwrappedProcedure,
    }

    const contextValue = { val: '__val__' }

    expect(execute).toBeCalledTimes(1)
    expect(execute).toHaveBeenCalledWith({ val: '123' }, contextValue, expect.objectContaining({
      ...meta,
      next: expect.any(Function),
    }))

    expect(onStart).toBeCalledTimes(1)
    expect(onStart).toHaveBeenCalledWith(
      { status: 'pending', input: { val: '123' }, output: undefined, error: undefined },
      contextValue,
      expect.objectContaining(meta),
    )

    expect(onSuccess).toBeCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledWith(
      { status: 'success', input: { val: '123' }, output: { val: 123 }, error: undefined },
      contextValue,
      expect.objectContaining(meta),
    )

    expect(onError).toBeCalledTimes(0)
  })

  it('accept paths', async () => {
    const onSuccess = vi.fn()
    const client = createProcedureClient(procedure, {
      path: ['users'],
      onSuccess,
    })

    await client({ val: '123' })

    expect(preMid1).toBeCalledTimes(1)
    expect(preMid1).toHaveBeenCalledWith(expect.objectContaining({ path: ['users'] }), expect.any(Object), expect.any(Function))

    expect(preMid2).toBeCalledTimes(1)
    expect(preMid2).toHaveBeenCalledWith(expect.objectContaining({ path: ['users'] }), expect.any(Object), expect.any(Function))

    expect(handler).toBeCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ path: ['users'] }))

    expect(onSuccess).toBeCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledWith(expect.any(Object), undefined, expect.objectContaining({ path: ['users'] }))
  })

  it('support signal', async () => {
    const controller = new AbortController()
    const signal = controller.signal

    const onSuccess = vi.fn()

    const client = createProcedureClient(procedure, {
      onSuccess,
      context: { userId: '123' },
    })

    await client({ val: '123' }, { signal })

    expect(preMid1).toBeCalledTimes(1)
    expect(preMid1).toHaveBeenCalledWith(expect.objectContaining({ signal }), expect.any(Object), expect.any(Function))

    expect(preMid2).toBeCalledTimes(1)
    expect(preMid2).toHaveBeenCalledWith(expect.objectContaining({ signal }), expect.any(Object), expect.any(Function))

    expect(postMid1).toBeCalledTimes(1)
    expect(postMid1).toHaveBeenCalledWith(expect.objectContaining({ signal }), expect.any(Object), expect.any(Function))

    expect(postMid2).toBeCalledTimes(1)
    expect(postMid2).toHaveBeenCalledWith(expect.objectContaining({ signal }), expect.any(Object), expect.any(Function))

    expect(handler).toBeCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ signal }))

    expect(onSuccess).toBeCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), expect.objectContaining({ signal }))
  })

  describe('error validation', () => {
    const client = createProcedureClient(procedure)

    it('transform non-error to error', () => {
      handler.mockRejectedValueOnce('non-error')

      expect(client({ val: '123' })).rejects.toSatisfy(error => error instanceof Error && error.message === 'non-error')
    })

    it('throw non-ORPC Error right away', () => {
      const e1 = new Error('non-ORPC Error')
      handler.mockRejectedValueOnce(e1)
      expect(client({ val: '123' })).rejects.toBe(e1)
    })

    it('validate ORPC Error', async () => {
      const e1 = new ORPCError({ code: 'BAD_REQUEST' })
      const e2 = new ORPCError({ code: 'BAD_REQUEST', defined: true })

      handler.mockRejectedValueOnce(e1)
      vi.mocked(validateORPCError).mockReturnValueOnce(Promise.resolve(e2))

      await expect(client({ val: '123' })).rejects.toBe(e2)

      expect(validateORPCError).toBeCalledTimes(1)
      expect(validateORPCError).toBeCalledWith(baseErrors, e1)
    })
  })

  it('with client context', async () => {
    const context = vi.fn()
    const client = createProcedureClient(procedure, {
      context,
    })

    await client({ val: '123' })
    expect(context).toBeCalledTimes(1)
    expect(context).toBeCalledWith(undefined)

    context.mockClear()
    await client({ val: '123' }, { context: { cache: true } })
    expect(context).toBeCalledTimes(1)
    expect(context).toBeCalledWith({ cache: true })
  })
})

it('still work without InputSchema', async () => {
  const procedure = new Procedure({
    contract: new ContractProcedure({
      InputSchema: undefined,
      OutputSchema: schema,
      errorMap: {},
    }),
    handler,
    middlewares: [],
    inputValidationIndex: 0,
    outputValidationIndex: 0,
  })

  const client = createProcedureClient(procedure)

  await expect(client('anything')).resolves.toEqual({ val: 123 })

  expect(handler).toBeCalledTimes(1)
  expect(handler).toHaveBeenCalledWith({ input: 'anything', context: undefined, path: [], procedure })
})

it('still work without OutputSchema', async () => {
  const procedure = new Procedure({
    contract: new ContractProcedure({
      InputSchema: schema,
      OutputSchema: undefined,
      errorMap: {},
    }),
    handler,
    middlewares: [],
    inputValidationIndex: 0,
    outputValidationIndex: 0,
  })

  const client = createProcedureClient(procedure)

  // @ts-expect-error - without output schema
  handler.mockReturnValueOnce('anything')

  await expect(client({ val: '123' })).resolves.toEqual('anything')

  expect(handler).toBeCalledTimes(1)
  expect(handler).toHaveBeenCalledWith({ input: { val: 123 }, context: undefined, path: [], procedure })
})

it('has helper `output` in meta', async () => {
  const client = createProcedureClient(procedure)

  preMid2.mockImplementationOnce((_, __, output) => {
    return output({ val: 99990 })
  })

  await expect(client({ val: '123' })).resolves.toEqual({ val: 99990 })

  expect(preMid1).toBeCalledTimes(1)
  expect(preMid2).toBeCalledTimes(1)
  expect(handler).toBeCalledTimes(0)

  expect(preMid1).toReturnWith(Promise.resolve({ output: { val: '99990' }, context: undefined }))
})
