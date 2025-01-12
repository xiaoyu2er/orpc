import { ContractProcedure } from '@orpc/contract'
import { z } from 'zod'
import { isProcedure } from './procedure'
import { ProcedureBuilder } from './procedure-builder'
import { ProcedureImplementer } from './procedure-implementer'

const baseSchema = z.object({ base: z.string().transform(v => Number.parseInt(v)) })
const baseErrors = {
  PAYMENT_REQUIRED: {
    status: 402,
    message: 'default message',
    data: baseSchema,
  },
}
const baseMid = vi.fn()

const builder = new ProcedureBuilder({
  contract: new ContractProcedure({
    InputSchema: baseSchema,
    OutputSchema: baseSchema,
    errorMap: baseErrors,
  }),
  middlewares: [baseMid],
})

const schema = z.object({ id: z.string().transform(v => Number.parseInt(v)) })
const example = { id: '1' }
const out_example = { id: 1 }

describe('self chainable', () => {
  it('route', () => {
    const route = { method: 'GET', path: '/test', deprecated: true, description: 'des', summary: 'sum', tags: ['hi'] } as const
    const routed = builder.route(route)

    expect(routed).not.toBe(builder)
    expect(routed).toBeInstanceOf(ProcedureBuilder)
    expect(routed['~orpc'].contract['~orpc'].route).toEqual(route)
    expect(routed['~orpc'].contract['~orpc'].InputSchema).toEqual(baseSchema)
    expect(routed['~orpc'].contract['~orpc'].OutputSchema).toEqual(baseSchema)
    expect(routed['~orpc'].contract['~orpc'].errorMap).toEqual(baseErrors)
    expect(routed['~orpc'].middlewares).toEqual([baseMid])
  })

  it('input', () => {
    const input_ed = builder.input(schema, example)

    expect(input_ed).not.toBe(builder)
    expect(input_ed).toBeInstanceOf(ProcedureBuilder)
    expect(input_ed['~orpc'].contract['~orpc'].InputSchema).toBe(schema)
    expect(input_ed['~orpc'].contract['~orpc'].inputExample).toBe(example)
    expect(input_ed['~orpc'].contract['~orpc'].OutputSchema).toEqual(baseSchema)
    expect(input_ed['~orpc'].contract['~orpc'].errorMap).toEqual(baseErrors)
    expect(input_ed['~orpc'].contract['~orpc'].inputExample).toEqual(example)
    expect(input_ed['~orpc'].middlewares).toEqual([baseMid])
  })

  it('output', () => {
    const output_ed = builder.output(schema, out_example)

    expect(output_ed).not.toBe(builder)
    expect(output_ed).toBeInstanceOf(ProcedureBuilder)
    expect(output_ed['~orpc'].contract['~orpc'].OutputSchema).toBe(schema)
    expect(output_ed['~orpc'].contract['~orpc'].outputExample).toBe(out_example)
    expect(output_ed['~orpc'].contract['~orpc'].InputSchema).toEqual(baseSchema)
    expect(output_ed['~orpc'].contract['~orpc'].errorMap).toEqual(baseErrors)
    expect(output_ed['~orpc'].contract['~orpc'].outputExample).toEqual(out_example)
    expect(output_ed['~orpc'].middlewares).toEqual([baseMid])
  })

  it('errors', () => {
    const errors = {
      BAD: {
        status: 500,
        data: schema,
      },
    }

    const errors_ed = builder.errors(errors)

    expect(errors_ed).not.toBe(builder)
    expect(errors_ed).toBeInstanceOf(ProcedureBuilder)
    expect(errors_ed['~orpc'].contract['~orpc'].errorMap).toBe(errors)
    expect(errors_ed['~orpc'].contract['~orpc'].InputSchema).toEqual(baseSchema)
    expect(errors_ed['~orpc'].contract['~orpc'].OutputSchema).toEqual(baseSchema)
    expect(errors_ed['~orpc'].middlewares).toEqual([baseMid])
  })
})

describe('to ProcedureImplementer', () => {
  it('use middleware', () => {
    const mid = vi.fn()

    const implementer = builder.use(mid)

    expect(implementer).toBeInstanceOf(ProcedureImplementer)
    expect(implementer['~orpc'].preMiddlewares).toEqual([baseMid])
    expect(implementer['~orpc'].postMiddlewares).toEqual([mid])
    expect(implementer['~orpc'].contract['~orpc'].InputSchema).toEqual(baseSchema)
    expect(implementer['~orpc'].contract['~orpc'].OutputSchema).toEqual(baseSchema)
    expect(implementer['~orpc'].contract['~orpc'].errorMap).toEqual(baseErrors)
  })

  it('use middleware with map input', () => {
    const mid = vi.fn()
    const map_input = vi.fn()

    const implementer = builder.use(mid, map_input)
    expect(implementer).toBeInstanceOf(ProcedureImplementer)
    expect(implementer['~orpc'].preMiddlewares).toEqual([baseMid])
    expect(implementer['~orpc'].postMiddlewares).toEqual([expect.any(Function)])
    expect(implementer['~orpc'].contract['~orpc'].InputSchema).toEqual(baseSchema)
    expect(implementer['~orpc'].contract['~orpc'].OutputSchema).toEqual(baseSchema)
    expect(implementer['~orpc'].contract['~orpc'].errorMap).toEqual(baseErrors)

    map_input.mockReturnValueOnce('__input__')
    mid.mockReturnValueOnce('__mid__')

    expect((implementer as any)['~orpc'].postMiddlewares[0]({}, 'input', '__output__')).toBe('__mid__')

    expect(map_input).toBeCalledTimes(1)
    expect(map_input).toBeCalledWith('input')

    expect(mid).toBeCalledTimes(1)
    expect(mid).toBeCalledWith({}, '__input__', '__output__')
  })
})

describe('to DecoratedProcedure', () => {
  it('handler', () => {
    const handler = vi.fn()
    const procedure = builder.handler(handler)

    expect(procedure).toSatisfy(isProcedure)

    expect(procedure['~orpc'].handler).toBe(handler)
    expect(procedure['~orpc'].preMiddlewares).toEqual([baseMid])
    expect(procedure['~orpc'].contract['~orpc'].InputSchema).toEqual(baseSchema)
    expect(procedure['~orpc'].contract['~orpc'].OutputSchema).toEqual(baseSchema)
    expect(procedure['~orpc'].contract['~orpc'].errorMap).toEqual(baseErrors)
  })
})
