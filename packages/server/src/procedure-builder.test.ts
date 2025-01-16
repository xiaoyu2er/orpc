import { ContractProcedure } from '@orpc/contract'
import { z } from 'zod'
import { ProcedureBuilder } from './procedure-builder'
import { ProcedureBuilderWithInput } from './procedure-builder-with-input'
import { ProcedureBuilderWithOutput } from './procedure-builder-with-output'
import { DecoratedProcedure } from './procedure-decorated'

const baseErrors = {
  BASE: {
    status: 402,
    message: 'default message',
    data: z.object({
      why: z.string(),
    }),
  },
}

const mid = vi.fn()

const builder = new ProcedureBuilder({
  middlewares: [mid],
  inputValidationIndex: 1,
  outputValidationIndex: 1,
  contract: new ContractProcedure({
    InputSchema: undefined,
    OutputSchema: undefined,
    errorMap: baseErrors,
  }),
})

const schema = z.object({ id: z.string().transform(v => Number.parseInt(v)) })

describe('procedureBuilder', () => {
  it('.errors', () => {
    const errors = { CODE: { message: 'MESSAGE' } }
    const applied = builder.errors(errors)

    expect(applied).toBeInstanceOf(ProcedureBuilder)
    expect(applied).not.toBe(builder)
    expect(applied['~orpc'].middlewares).toEqual([mid])
    expect(applied['~orpc'].inputValidationIndex).toEqual(1)
    expect(applied['~orpc'].outputValidationIndex).toEqual(1)
    expect(applied['~orpc'].contract['~orpc'].errorMap).toEqual({
      ...baseErrors,
      ...errors,
    })
  })

  it('.route', () => {
    const applied = builder.route({ tags: ['a'] })

    expect(applied).toBeInstanceOf(ProcedureBuilder)
    expect(applied).not.toBe(builder)
    expect(applied['~orpc'].middlewares).toEqual([mid])
    expect(applied['~orpc'].inputValidationIndex).toEqual(1)
    expect(applied['~orpc'].outputValidationIndex).toEqual(1)
    expect(applied['~orpc'].contract['~orpc'].errorMap).toEqual(baseErrors)
  })

  it('.use', () => {
    const mid2 = vi.fn()

    const applied = builder.use(mid2)

    expect(applied).toBeInstanceOf(ProcedureBuilder)
    expect(applied).not.toBe(builder)
    expect(applied['~orpc'].middlewares).toEqual([mid, mid2])
    expect(applied['~orpc'].inputValidationIndex).toEqual(2)
    expect(applied['~orpc'].outputValidationIndex).toEqual(2)
    expect(applied['~orpc'].contract['~orpc'].errorMap).toEqual(baseErrors)
  })

  it('.input', () => {
    const applied = builder.input(schema)

    expect(applied).toBeInstanceOf(ProcedureBuilderWithInput)
    expect(applied['~orpc'].middlewares).toEqual([mid])
    expect(applied['~orpc'].inputValidationIndex).toEqual(1)
    expect(applied['~orpc'].outputValidationIndex).toEqual(1)
    expect(applied['~orpc'].contract['~orpc'].InputSchema).toEqual(schema)
    expect(applied['~orpc'].contract['~orpc'].errorMap).toEqual(baseErrors)
  })

  it('.output', () => {
    const applied = builder.output(schema)

    expect(applied).toBeInstanceOf(ProcedureBuilderWithOutput)
    expect(applied['~orpc'].middlewares).toEqual([mid])
    expect(applied['~orpc'].inputValidationIndex).toEqual(1)
    expect(applied['~orpc'].outputValidationIndex).toEqual(1)
    expect(applied['~orpc'].contract['~orpc'].OutputSchema).toEqual(schema)
    expect(applied['~orpc'].contract['~orpc'].errorMap).toEqual(baseErrors)
  })

  it('.handler', () => {
    const handler = vi.fn()
    const applied = builder.handler(handler)

    expect(applied).toBeInstanceOf(DecoratedProcedure)
    expect(applied['~orpc'].middlewares).toEqual([mid])
    expect(applied['~orpc'].inputValidationIndex).toEqual(1)
    expect(applied['~orpc'].outputValidationIndex).toEqual(1)
    expect(applied['~orpc'].contract['~orpc'].errorMap).toEqual(baseErrors)
  })
})
