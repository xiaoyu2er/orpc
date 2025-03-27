import type { HTTPPath } from '@orpc/client'
import type { ErrorMap, MergedErrorMap } from './error'
import type { Meta } from './meta'
import type { ContractProcedure } from './procedure'
import type { Route } from './route'
import type { ContractRouter } from './router'
import type { EnhanceContractRouterOptions, EnhancedContractRouter } from './router-utils'
import type { AnySchema } from './schema'

export interface ContractProcedureBuilder<
  TInputSchema extends AnySchema,
  TOutputSchema extends AnySchema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> extends ContractProcedure<TInputSchema, TOutputSchema, TErrorMap, TMeta> {
  errors<U extends ErrorMap>(
    errors: U,
  ): ContractProcedureBuilder<TInputSchema, TOutputSchema, MergedErrorMap<TErrorMap, U>, TMeta>

  meta(
    meta: TMeta,
  ): ContractProcedureBuilder<TInputSchema, TOutputSchema, TErrorMap, TMeta>

  route(
    route: Route,
  ): ContractProcedureBuilder<TInputSchema, TOutputSchema, TErrorMap, TMeta>

  input<U extends AnySchema>(
    schema: U,
  ): ContractProcedureBuilderWithInput<U, TOutputSchema, TErrorMap, TMeta>

  output<U extends AnySchema>(
    schema: U,
  ): ContractProcedureBuilderWithOutput<TInputSchema, U, TErrorMap, TMeta>
}

export interface ContractProcedureBuilderWithInput<
  TInputSchema extends AnySchema,
  TOutputSchema extends AnySchema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
>extends ContractProcedure<TInputSchema, TOutputSchema, TErrorMap, TMeta> {
  errors<U extends ErrorMap>(
    errors: U,
  ): ContractProcedureBuilderWithInput<TInputSchema, TOutputSchema, MergedErrorMap<TErrorMap, U>, TMeta>

  meta(
    meta: TMeta,
  ): ContractProcedureBuilderWithInput<TInputSchema, TOutputSchema, TErrorMap, TMeta>

  route(
    route: Route,
  ): ContractProcedureBuilderWithInput<TInputSchema, TOutputSchema, TErrorMap, TMeta>

  output<U extends AnySchema>(
    schema: U,
  ): ContractProcedureBuilderWithInputOutput<TInputSchema, U, TErrorMap, TMeta>
}

export interface ContractProcedureBuilderWithOutput<
  TInputSchema extends AnySchema,
  TOutputSchema extends AnySchema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> extends ContractProcedure<TInputSchema, TOutputSchema, TErrorMap, TMeta> {
  errors<U extends ErrorMap>(
    errors: U,
  ): ContractProcedureBuilderWithOutput<TInputSchema, TOutputSchema, MergedErrorMap<TErrorMap, U>, TMeta>

  meta(
    meta: TMeta,
  ): ContractProcedureBuilderWithOutput<TInputSchema, TOutputSchema, TErrorMap, TMeta>

  route(
    route: Route,
  ): ContractProcedureBuilderWithOutput<TInputSchema, TOutputSchema, TErrorMap, TMeta>

  input<U extends AnySchema>(
    schema: U,
  ): ContractProcedureBuilderWithInputOutput<U, TOutputSchema, TErrorMap, TMeta>
}

export interface ContractProcedureBuilderWithInputOutput<
  TInputSchema extends AnySchema,
  TOutputSchema extends AnySchema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> extends ContractProcedure<TInputSchema, TOutputSchema, TErrorMap, TMeta> {
  errors<U extends ErrorMap>(
    errors: U,
  ): ContractProcedureBuilderWithInputOutput<TInputSchema, TOutputSchema, MergedErrorMap<TErrorMap, U>, TMeta>

  meta(
    meta: TMeta,
  ): ContractProcedureBuilderWithInputOutput<TInputSchema, TOutputSchema, TErrorMap, TMeta>

  route(
    route: Route,
  ): ContractProcedureBuilderWithInputOutput<TInputSchema, TOutputSchema, TErrorMap, TMeta>
}

export interface ContractRouterBuilder<
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> {
  '~orpc': EnhanceContractRouterOptions<TErrorMap>

  'errors'<U extends ErrorMap>(
    errors: U,
  ): ContractRouterBuilder<MergedErrorMap<TErrorMap, U>, TMeta>

  'prefix'(prefix: HTTPPath): ContractRouterBuilder <TErrorMap, TMeta>

  'tag'(...tags: string[]): ContractRouterBuilder <TErrorMap, TMeta>

  'router'<T extends ContractRouter<TMeta>>(router: T): EnhancedContractRouter<T, TErrorMap>
}
