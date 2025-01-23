import { isContractProcedure } from '@orpc/contract'
import { baseMeta, baseRoute, inputSchema, outputSchema } from '../../contract/tests/shared'
import { router } from '../tests/shared'
import { BuilderWithMiddlewares } from './builder-with-middlewares'
import { unlazy } from './lazy'
import { ProcedureBuilder } from './procedure-builder'
import { ProcedureBuilderWithInput } from './procedure-builder-with-input'
import { ProcedureBuilderWithOutput } from './procedure-builder-with-output'
import { DecoratedProcedure } from './procedure-decorated'
import * as RouterAccessibleLazy from './router-accessible-lazy'
import { RouterBuilder } from './router-builder'
import * as RouterUtils from './router-utils'

const adaptRouterSpy = vi.spyOn(RouterUtils, 'adaptRouter')
const createAccessibleLazySpy = vi.spyOn(RouterAccessibleLazy, 'createAccessibleLazyRouter')

const mid = vi.fn()

const def = {
  errorMap: {},
  inputSchema: undefined,
  outputSchema: undefined,
  inputValidationIndex: 99,
  meta: baseMeta,
  outputValidationIndex: 88,
  route: baseRoute,
  middlewares: [mid],
}

const builder = new BuilderWithMiddlewares(def)

describe('builderWithMiddlewares', () => {
  it('is a contract procedure', () => {
    expect(builder).toSatisfy(isContractProcedure)
  })

  it('.errors', () => {
    const errors = { BAD_GATEWAY: { message: 'BAD' } }

    const applied = builder.errors(errors)
    expect(applied).toBeInstanceOf(BuilderWithMiddlewares)

    expect(applied['~orpc']).toEqual({
      ...def,
      errorMap: errors,
    })
  })

  it('.use', () => {
    const mid2 = vi.fn()

    const applied = builder.use(mid2)
    expect(applied).toBeInstanceOf(BuilderWithMiddlewares)

    expect(applied['~orpc']).toEqual({
      ...def,
      middlewares: [mid, mid2],
      inputValidationIndex: 100,
      outputValidationIndex: 89,
    })
  })

  it('.meta', () => {
    const meta = { log: true } as any

    const applied = builder.meta(meta)
    expect(applied).toBeInstanceOf(ProcedureBuilder)

    expect(applied['~orpc']).toEqual({
      ...def,
      meta: { ...baseMeta, ...meta },
    })
  })

  it('.route', () => {
    const route = { description: 'test' } as any

    const applied = builder.route(route)
    expect(applied).toBeInstanceOf(ProcedureBuilder)

    expect(applied['~orpc']).toEqual({
      ...def,
      route: { ...baseRoute, ...route },
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
    expect(applied).toBeInstanceOf(DecoratedProcedure)

    expect(applied['~orpc']).toEqual({
      ...def,
      handler,
    })
  })

  it('.prefix', () => {
    const applied = builder.prefix('/test')

    expect(applied).toBeInstanceOf(RouterBuilder)
    expect(applied['~orpc']).toEqual({
      prefix: '/test',
      middlewares: [mid],
      errorMap: {},
    })
  })

  it('.tag', () => {
    const applied = builder.tag('test')

    expect(applied).toBeInstanceOf(RouterBuilder)
    expect(applied['~orpc']).toEqual({
      middlewares: [mid],
      tags: ['test'],
      errorMap: {},
    })
  })

  it('.router', () => {
    const applied = builder.router(router as any)
    expect(applied).toBe(adaptRouterSpy.mock.results[0]?.value)
    expect(adaptRouterSpy).toHaveBeenCalledTimes(1)
    expect(adaptRouterSpy).toHaveBeenCalledWith(router, def)
  })

  it('.lazy', () => {
    const applied = builder.lazy(() => Promise.resolve({ default: router as any }))
    expect(applied).toBe(createAccessibleLazySpy.mock.results[0]?.value)
    const lazied = createAccessibleLazySpy.mock.calls[0]![0]
    expect(unlazy(lazied)).resolves.toEqual({ default: router })
  })
})
