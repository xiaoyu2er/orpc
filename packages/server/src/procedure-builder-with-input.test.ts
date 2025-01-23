import { baseErrorMap, baseMeta, baseRoute, inputSchema, outputSchema } from '../../contract/tests/shared'
import { ProcedureBuilderWithInput } from './procedure-builder-with-input'
import { ProcedureBuilderWithoutHandler } from './procedure-builder-without-handler'

const mid = vi.fn()

vi.mock('./middleware-decorated', () => ({
  decorateMiddleware: vi.fn(mid => ({
    mapInput: vi.fn(map => [mid, map]),
  })),
}))

const def = {
  middlewares: [mid],
  inputValidationIndex: 1,
  outputValidationIndex: 1,
  inputSchema,
  outputSchema: undefined,
  errorMap: baseErrorMap,
  route: baseRoute,
  meta: baseMeta as any,
}

const builder = new ProcedureBuilderWithInput(def)

describe('procedureBuilderWithInput', () => {
  it('.errors', () => {
    const errors = { CODE: { message: 'MESSAGE' } }

    const applied = builder.errors(errors)
    expect(applied).toBeInstanceOf(ProcedureBuilderWithInput)
    expect(applied).not.toBe(builder)

    expect(applied['~orpc']).toEqual({
      ...def,
      errorMap: {
        ...def.errorMap,
        ...errors,
      },
    })
  })

  it('.meta', () => {
    const meta = { mode: 'TEST-DDD' } as const

    const applied = builder.meta(meta)
    expect(applied).toBeInstanceOf(ProcedureBuilderWithInput)
    expect(applied).not.toBe(builder)

    expect(applied['~orpc']).toEqual({
      ...def,
      meta: {
        ...def.meta,
        ...meta,
      },
    })
  })

  it('.route', () => {
    const route = { method: 'DELETE', tag: ['ua'] } as const

    const applied = builder.route(route)
    expect(applied).toBeInstanceOf(ProcedureBuilderWithInput)
    expect(applied).not.toBe(builder)

    expect(applied['~orpc']).toEqual({
      ...def,
      route: {
        ...def.route,
        ...route,
      },
    })
  })

  describe('.use', () => {
    it('without map input', () => {
      const mid = vi.fn()

      const applied = builder.use(mid)
      expect(applied).not.toBe(builder)
      expect(applied).toBeInstanceOf(ProcedureBuilderWithInput)

      expect(applied['~orpc']).toEqual({
        ...def,
        middlewares: [...def.middlewares, mid],
        outputValidationIndex: 2,
      })
    })

    it('with map input', () => {
      const mid = vi.fn()
      const map = vi.fn()

      const applied = builder.use(mid, map)
      expect(applied).not.toBe(builder)
      expect(applied).toBeInstanceOf(ProcedureBuilderWithInput)

      expect(applied['~orpc']).toEqual({
        ...def,
        middlewares: [...def.middlewares, [mid, map]],
        outputValidationIndex: 2,
      })
    })
  })

  it('.output', () => {
    const applied = builder.output(outputSchema)
    expect(applied).toBeInstanceOf(ProcedureBuilderWithoutHandler)

    expect(applied['~orpc']).toEqual({
      ...def,
      outputSchema,
    })
  })

  it('.handler', () => {
    const handler = vi.fn()
    const applied = builder.handler(handler)

    expect(applied['~orpc']).toEqual({
      ...def,
      handler,
    })
  })
})
