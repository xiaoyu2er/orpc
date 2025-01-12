import { ContractProcedure } from '@orpc/contract'
import { z } from 'zod'
import { isProcedure } from './procedure'
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

const implementer = new ProcedureImplementer({
  contract: new ContractProcedure({
    InputSchema: baseSchema,
    OutputSchema: baseSchema,
    errorMap: baseErrors,
  }),
  preMiddlewares: [baseMid],
  postMiddlewares: [baseMid],
})

const schema = z.object({ val: z.string().transform(v => Number.parseInt(v)) })

describe('self chainable', () => {
  it('use middleware', () => {
    const mid1 = vi.fn()
    const mid2 = vi.fn()
    const i = implementer.use(mid1).use(mid2)

    expect(i).not.toBe(implementer)
    expect(i).toBeInstanceOf(ProcedureImplementer)
    expect(i['~orpc'].postMiddlewares).toEqual([baseMid, mid1, mid2])
    expect(i['~orpc'].contract['~orpc'].InputSchema).toEqual(baseSchema)
    expect(i['~orpc'].contract['~orpc'].OutputSchema).toEqual(baseSchema)
    expect(i['~orpc'].contract['~orpc'].errorMap).toEqual(baseErrors)
  })

  it('use middleware with map input', () => {
    const mid = vi.fn()
    const map = vi.fn()

    const i = implementer.use(mid, map)

    expect(i).not.toBe(implementer)
    expect(i).toBeInstanceOf(ProcedureImplementer)
    expect(i['~orpc'].postMiddlewares).toEqual([baseMid, expect.any(Function)])
    expect(i['~orpc'].contract['~orpc'].InputSchema).toEqual(baseSchema)
    expect(i['~orpc'].contract['~orpc'].OutputSchema).toEqual(baseSchema)
    expect(i['~orpc'].contract['~orpc'].errorMap).toEqual(baseErrors)

    map.mockReturnValueOnce('__input__')
    mid.mockReturnValueOnce('__mid__')

    expect((i as any)['~orpc'].postMiddlewares[1]({}, 'input', '__output__')).toBe('__mid__')

    expect(map).toBeCalledTimes(1)
    expect(map).toBeCalledWith('input')

    expect(mid).toBeCalledTimes(1)
    expect(mid).toBeCalledWith({}, '__input__', '__output__')
  })
})

describe('to DecoratedProcedure', () => {
  it('handler', () => {
    const handler = vi.fn()
    const procedure = implementer.handler(handler)

    expect(procedure).toSatisfy(isProcedure)
    expect(procedure['~orpc'].handler).toBe(handler)
    expect(procedure['~orpc'].postMiddlewares).toEqual([baseMid])
    expect(procedure['~orpc'].contract['~orpc'].InputSchema).toEqual(baseSchema)
    expect(procedure['~orpc'].contract['~orpc'].OutputSchema).toEqual(baseSchema)
    expect(procedure['~orpc'].contract['~orpc'].errorMap).toEqual(baseErrors)
  })
})
