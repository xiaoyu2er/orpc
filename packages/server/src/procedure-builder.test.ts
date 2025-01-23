import { baseErrorMap, baseMeta, baseRoute, inputSchema, outputSchema } from '../../contract/tests/shared'
import { ProcedureBuilder } from './procedure-builder'
import { ProcedureBuilderWithInput } from './procedure-builder-with-input'
import { ProcedureBuilderWithOutput } from './procedure-builder-with-output'

const mid = vi.fn()

const def = {
  middlewares: [mid],
  inputValidationIndex: 1,
  outputValidationIndex: 1,
  inputSchema: undefined,
  outputSchema: undefined,
  errorMap: baseErrorMap,
  route: baseRoute,
  meta: baseMeta as any,
}

const builder = new ProcedureBuilder(def)

describe('procedureBuilder', () => {
  it('.errors', () => {
    const errors = { CODE: { message: 'MESSAGE' } }

    const applied = builder.errors(errors)
    expect(applied).toBeInstanceOf(ProcedureBuilder)
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
    expect(applied).toBeInstanceOf(ProcedureBuilder)
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
    expect(applied).toBeInstanceOf(ProcedureBuilder)
    expect(applied).not.toBe(builder)

    expect(applied['~orpc']).toEqual({
      ...def,
      route: {
        ...def.route,
        ...route,
      },
    })
  })

  it('.use', () => {
    const mid = vi.fn()

    const applied = builder.use(mid)
    expect(applied).toBeInstanceOf(ProcedureBuilder)
    expect(applied).not.toBe(builder)

    expect(applied['~orpc']).toEqual({
      ...def,
      middlewares: [
        ...def.middlewares,
        mid,
      ],
      inputValidationIndex: 2,
      outputValidationIndex: 2,
    })
  })

  it('.input', () => {
    const applied = builder.input(inputSchema)
    expect(applied).toBeInstanceOf(ProcedureBuilderWithInput)

    expect(applied['~orpc']).toEqual({
      ...def,
      inputSchema,
    })
  })

  it('.output', () => {
    const applied = builder.output(outputSchema)
    expect(applied).toBeInstanceOf(ProcedureBuilderWithOutput)

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
