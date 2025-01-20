import { ContractProcedure } from '@orpc/contract'
import { z } from 'zod'
import * as middlewareDecorated from './middleware-decorated'
import { ProcedureBuilderWithInput } from './procedure-builder-with-input'
import { DecoratedProcedure } from './procedure-decorated'
import { ProcedureImplementer } from './procedure-implementer'

const decorateMiddlewareSpy = vi.spyOn(middlewareDecorated, 'decorateMiddleware')

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

const inputSchema = z.object({ input: z.string().transform(v => Number.parseInt(v)) })

const builder = new ProcedureBuilderWithInput({
  middlewares: [mid],
  inputValidationIndex: 1,
  outputValidationIndex: 1,
  contract: new ContractProcedure({
    InputSchema: inputSchema,
    OutputSchema: undefined,
    errorMap: baseErrors,
    route: {},
  }),
})

const schema = z.object({ id: z.string().transform(v => Number.parseInt(v)) })

describe('procedureBuilderWithInput', () => {
  it('.errors', () => {
    const errors = { CODE: { message: 'MESSAGE' } }
    const applied = builder.errors(errors)

    expect(applied).toBeInstanceOf(ProcedureBuilderWithInput)
    expect(applied).not.toBe(builder)
    expect(applied['~orpc'].middlewares).toEqual([mid])
    expect(applied['~orpc'].inputValidationIndex).toEqual(1)
    expect(applied['~orpc'].outputValidationIndex).toEqual(1)
    expect(applied['~orpc'].contract['~orpc'].InputSchema).toEqual(inputSchema)
    expect(applied['~orpc'].contract['~orpc'].errorMap).toEqual({
      ...baseErrors,
      ...errors,
    })
  })

  it('.route', () => {
    const applied = builder.route({ tags: ['a'] })

    expect(applied).toBeInstanceOf(ProcedureBuilderWithInput)
    expect(applied).not.toBe(builder)
    expect(applied['~orpc'].middlewares).toEqual([mid])
    expect(applied['~orpc'].inputValidationIndex).toEqual(1)
    expect(applied['~orpc'].outputValidationIndex).toEqual(1)
    expect(applied['~orpc'].contract['~orpc'].InputSchema).toEqual(inputSchema)
    expect(applied['~orpc'].contract['~orpc'].errorMap).toEqual(baseErrors)
  })

  describe('.use', () => {
    it('without map input', () => {
      const mid2 = vi.fn()

      const applied = builder.use(mid2)

      expect(applied).toBeInstanceOf(ProcedureBuilderWithInput)
      expect(applied).not.toBe(builder)
      expect(applied['~orpc'].middlewares).toEqual([mid, mid2])
      expect(applied['~orpc'].inputValidationIndex).toEqual(1)
      expect(applied['~orpc'].outputValidationIndex).toEqual(2)
      expect(applied['~orpc'].contract['~orpc'].InputSchema).toEqual(inputSchema)
      expect(applied['~orpc'].contract['~orpc'].errorMap).toEqual(baseErrors)
    })

    it('with map input', () => {
      const mappedMid = vi.fn()
      const mapInput = vi.fn(() => mappedMid)
      decorateMiddlewareSpy.mockReturnValueOnce({ mapInput } as any)

      const mid2 = vi.fn()
      const mid2MapInput = vi.fn()

      const applied = builder.use(mid2, mid2MapInput)

      expect(applied).toBeInstanceOf(ProcedureBuilderWithInput)
      expect(applied).not.toBe(builder)
      expect(applied['~orpc'].middlewares).toEqual([mid, mappedMid])
      expect(applied['~orpc'].inputValidationIndex).toEqual(1)
      expect(applied['~orpc'].outputValidationIndex).toEqual(2)
      expect(applied['~orpc'].contract['~orpc'].InputSchema).toEqual(inputSchema)
      expect(applied['~orpc'].contract['~orpc'].errorMap).toEqual(baseErrors)

      expect(decorateMiddlewareSpy).toHaveBeenCalledWith(mid2)
      expect(mapInput).toHaveBeenCalledWith(mid2MapInput)
    })
  })

  it('.output', () => {
    const applied = builder.output(schema)

    expect(applied).toBeInstanceOf(ProcedureImplementer)
    expect(applied['~orpc'].middlewares).toEqual([mid])
    expect(applied['~orpc'].inputValidationIndex).toEqual(1)
    expect(applied['~orpc'].outputValidationIndex).toEqual(1)
    expect(applied['~orpc'].contract['~orpc'].InputSchema).toEqual(inputSchema)
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
    expect(applied['~orpc'].contract['~orpc'].InputSchema).toEqual(inputSchema)
    expect(applied['~orpc'].contract['~orpc'].errorMap).toEqual(baseErrors)
  })
})
