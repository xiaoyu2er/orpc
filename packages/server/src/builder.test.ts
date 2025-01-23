import { isContractProcedure } from '@orpc/contract'
import { baseMeta, baseRoute, inputSchema, outputSchema } from '../../contract/tests/shared'
import { router } from '../tests/shared'
import { Builder } from './builder'
import { BuilderWithErrors } from './builder-with-errors'
import { BuilderWithMiddlewares } from './builder-with-middlewares'
import { unlazy } from './lazy'
import * as MiddlewareDecorated from './middleware-decorated'
import { ProcedureBuilder } from './procedure-builder'
import { ProcedureBuilderWithInput } from './procedure-builder-with-input'
import { ProcedureBuilderWithOutput } from './procedure-builder-with-output'
import { DecoratedProcedure } from './procedure-decorated'
import * as RouterAccessibleLazy from './router-accessible-lazy'
import { RouterBuilder } from './router-builder'

const decorateMiddlewareSpy = vi.spyOn(MiddlewareDecorated, 'decorateMiddleware')
const createAccessibleLazySpy = vi.spyOn(RouterAccessibleLazy, 'createAccessibleLazyRouter')

const def = {
  errorMap: {},
  inputSchema: undefined,
  outputSchema: undefined,
  inputValidationIndex: 99,
  meta: baseMeta,
  outputValidationIndex: 88,
  route: baseRoute,
}

const builder = new Builder(def)

describe('builder', () => {
  it('is a contract procedure', () => {
    expect(builder).toSatisfy(isContractProcedure)
  })

  it('.$config', () => {
    const applied = builder.$config({
      initialInputValidationIndex: Number.NEGATIVE_INFINITY,
      initialOutputValidationIndex: Number.POSITIVE_INFINITY,
    })
    expect(applied).instanceOf(Builder)
    expect(applied).not.toBe(builder)

    expect(applied['~orpc']).toEqual({
      ...def,
      inputValidationIndex: Number.NEGATIVE_INFINITY,
      outputValidationIndex: Number.POSITIVE_INFINITY,
    })
  })

  it('.$context', () => {
    expect(builder.$context()).toBe(builder)
  })

  it('.$meta', () => {
    const meta = { mode: 'test' }

    const applied = builder.$meta(meta)
    expect(applied).instanceOf(Builder)
    expect(applied).not.toBe(builder)

    expect(applied['~orpc']).toEqual({
      ...def,
      meta,
    })
  })

  it('.$route', () => {
    const route = { method: 'GET', description: 'test' } as const

    const applied = builder.$route(route)
    expect(applied).instanceOf(Builder)
    expect(applied).not.toBe(builder)

    expect(applied['~orpc']).toEqual({
      ...def,
      route,
    })
  })

  it('.middleware', () => {
    const mid = vi.fn()
    const applied = builder.middleware(mid)
    expect(applied).toBe(decorateMiddlewareSpy.mock.results[0]?.value)

    expect(decorateMiddlewareSpy).toBeCalledTimes(1)
    expect(decorateMiddlewareSpy).toBeCalledWith(mid)
  })

  it('.errors', () => {
    const errors = { BAD_GATEWAY: { message: 'BAD' } }

    const applied = builder.errors(errors)
    expect(applied).toBeInstanceOf(BuilderWithErrors)

    expect(applied['~orpc']).toEqual({
      ...def,
      errorMap: errors,
    })
  })

  it('.use', () => {
    const mid = vi.fn()

    const applied = builder.use(mid)
    expect(applied).toBeInstanceOf(BuilderWithMiddlewares)

    expect(applied['~orpc']).toEqual({
      ...def,
      middlewares: [mid],
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
      middlewares: [],
      meta: { ...baseMeta, ...meta },
    })
  })

  it('.route', () => {
    const route = { description: 'test' } as any

    const applied = builder.route(route)
    expect(applied).toBeInstanceOf(ProcedureBuilder)

    expect(applied['~orpc']).toEqual({
      ...def,
      middlewares: [],
      route: { ...baseRoute, ...route },
    })
  })

  it('.input', () => {
    const applied = builder.input(inputSchema)
    expect(applied).toBeInstanceOf(ProcedureBuilderWithInput)

    expect(applied['~orpc']).toEqual({
      ...def,
      middlewares: [],
      inputSchema,
    })
  })

  it('.output', () => {
    const applied = builder.output(outputSchema)
    expect(applied).toBeInstanceOf(ProcedureBuilderWithOutput)

    expect(applied['~orpc']).toEqual({
      ...def,
      middlewares: [],
      outputSchema,
    })
  })

  it('.handler', () => {
    const handler = vi.fn()

    const applied = builder.handler(handler)
    expect(applied).toBeInstanceOf(DecoratedProcedure)

    expect(applied['~orpc']).toEqual({
      ...def,
      middlewares: [],
      handler,
    })
  })

  it('.prefix', () => {
    const applied = builder.prefix('/test')

    expect(applied).toBeInstanceOf(RouterBuilder)
    expect(applied['~orpc']).toEqual({
      middlewares: [],
      prefix: '/test',
      errorMap: {},
    })
  })

  it('.tag', () => {
    const applied = builder.tag('test')

    expect(applied).toBeInstanceOf(RouterBuilder)
    expect(applied['~orpc']).toEqual({
      middlewares: [],
      tags: ['test'],
      errorMap: {},
    })
  })

  it('.router', () => {
    const applied = builder.router(router as any)
    expect(applied).toBe(router)
  })

  it('.lazy', () => {
    const applied = builder.lazy(() => Promise.resolve({ default: router as any }))
    expect(applied).toBe(createAccessibleLazySpy.mock.results[0]?.value)
    const lazied = createAccessibleLazySpy.mock.calls[0]![0]
    expect(unlazy(lazied)).resolves.toEqual({ default: router })
  })
})
