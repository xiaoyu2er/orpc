import type { OmitChainMethodDeep } from '@orpc/shared'
import type { baseErrorMap, BaseMeta, inputSchema, outputSchema } from '../tests/shared'
import type { ContractBuilder } from './builder'
import type { ContractProcedureBuilder, ContractProcedureBuilderWithInput, ContractProcedureBuilderWithInputOutput, ContractProcedureBuilderWithOutput, ContractRouterBuilder } from './builder-variants'

const builder = {} as ContractBuilder<typeof inputSchema, typeof outputSchema, typeof baseErrorMap, BaseMeta>

it('ContractProcedureBuilder', () => {
  const expected = {} as OmitChainMethodDeep<typeof builder, '$meta' | '$route' | 'prefix' | 'tag' | 'router'>
  const actual = {} as ContractProcedureBuilder<typeof inputSchema, typeof outputSchema, typeof baseErrorMap, BaseMeta>

  expectTypeOf(actual).toMatchTypeOf(expected)
  expectTypeOf<keyof typeof actual>().toEqualTypeOf<keyof typeof expected>()
})

it('ContractProcedureBuilderWithInput', () => {
  const expected = {} as OmitChainMethodDeep<typeof builder, '$meta' | '$route' | 'prefix' | 'tag' | 'router' | 'input'>
  const actual = {} as ContractProcedureBuilderWithInput<typeof inputSchema, typeof outputSchema, typeof baseErrorMap, BaseMeta>

  expectTypeOf(actual).toMatchTypeOf(expected)
  expectTypeOf<keyof typeof actual>().toEqualTypeOf<keyof typeof expected>()
})

it('ContractProcedureBuilderWithOutput', () => {
  const expected = {} as OmitChainMethodDeep<typeof builder, '$meta' | '$route' | 'prefix' | 'tag' | 'router' | 'output'>
  const actual = {} as ContractProcedureBuilderWithOutput<typeof inputSchema, typeof outputSchema, typeof baseErrorMap, BaseMeta>

  expectTypeOf(actual).toMatchTypeOf(expected)
  expectTypeOf<keyof typeof actual>().toEqualTypeOf<keyof typeof expected>()
})

it('ContractProcedureBuilderWithInputOutput', () => {
  const expected = {} as OmitChainMethodDeep<typeof builder, '$meta' | '$route' | 'prefix' | 'tag' | 'router' | 'input' | 'output'>
  const actual = {} as ContractProcedureBuilderWithInputOutput<typeof inputSchema, typeof outputSchema, typeof baseErrorMap, BaseMeta>

  expectTypeOf(actual).toMatchTypeOf(expected)
  expectTypeOf<keyof typeof actual>().toEqualTypeOf<keyof typeof expected>()
})

it('ContractRouterBuilder', () => {
  const expected = {} as OmitChainMethodDeep<typeof builder, '$meta' | '$route' | 'route' | 'meta' | 'input' | 'output'>
  const actual = {} as ContractRouterBuilder<typeof baseErrorMap, BaseMeta>

  //   expectTypeOf(actual).toMatchTypeOf(expected)
  expectTypeOf<keyof typeof actual>().toEqualTypeOf<keyof typeof expected>()
})
