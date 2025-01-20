import { oc } from '@orpc/contract'
import { z } from 'zod'
import { unlazy } from './lazy'
import { Procedure } from './procedure'
import { RouterImplementer } from './router-implementer'
import { unshiftMiddlewaresRouter } from './router-utils'

vi.mock('./router-utils', () => ({
  unshiftMiddlewaresRouter: vi.fn(() => ({ mocked: true })),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

const schema = z.object({ val: z.string().transform(val => Number(val)) })

const ping = oc.input(schema).output(schema)
const pong = oc.route({ method: 'GET', path: '/ping' })

const contract = oc.router({
  ping,
  pong,
  nested: {
    ping,
    pong,
  },
})

const pingImpl = new Procedure({
  contract: ping,
  handler: vi.fn(),
  middlewares: [],
  inputValidationIndex: 0,
  outputValidationIndex: 0,
})

const pongImpl = new Procedure({
  contract: pong,
  handler: vi.fn(),
  middlewares: [],
  inputValidationIndex: 0,
  outputValidationIndex: 0,
})

const router = {
  ping: pingImpl,
  pong: pongImpl,
  nested: {
    ping: pingImpl,
    pong: pongImpl,
  },
}

const mid = vi.fn()
const implementer = new RouterImplementer({
  contract,
  middlewares: [mid],
})

describe('self chainable', () => {
  it('use middleware', () => {
    const mid1 = vi.fn()
    const mid2 = vi.fn()
    const mid3 = vi.fn()

    const implementer = new RouterImplementer({
      contract,
      middlewares: [],
    })

    const applied1 = implementer.use(mid1)
    expect(applied1).not.toBe(implementer)
    expect(applied1).toBeInstanceOf(RouterImplementer)
    expect(applied1['~orpc'].middlewares).toEqual([mid1])

    const applied2 = applied1.use(mid2).use(mid3)
    expect(applied2['~orpc'].middlewares).toEqual([mid1, mid2, mid3])
  })
})

describe('to AdaptedRouter', () => {
  it('works', () => {
    expect(implementer.router(router)).toEqual({ mocked: true })

    expect(unshiftMiddlewaresRouter).toBeCalledTimes(1)
    expect(unshiftMiddlewaresRouter).toBeCalledWith(router, expect.objectContaining({
      middlewares: [mid],
    }))
  })
})

describe('to AdaptedLazy', () => {
  it('works', () => {
    const loader = () => Promise.resolve({ default: router })
    expect(implementer.lazy(loader)).toEqual({ mocked: true })

    expect(unshiftMiddlewaresRouter).toBeCalledTimes(1)
    expect(unshiftMiddlewaresRouter).toBeCalledWith(expect.any(Object), expect.objectContaining({
      middlewares: [mid],
    }))

    expect(unlazy(vi.mocked(unshiftMiddlewaresRouter).mock.calls[0]![0]))
      .resolves
      .toEqual({ default: router })
  })
})
