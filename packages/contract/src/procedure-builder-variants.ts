import type { ErrorMap, MergedErrorMap } from './error-map'
import type { Meta } from './meta'
import type { ContractProcedure } from './procedure'
import type { Route } from './route'
import type { Schema } from './schema'

export interface ContractProcedureBuilderWithoutInputOutputMethods<
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> extends ContractProcedure<TInputSchema, TOutputSchema, TErrorMap, TMeta> {
  errors: <U extends ErrorMap>(
    errors: U,
  ) => ContractProcedureBuilderWithoutInputOutputMethods<TInputSchema, TOutputSchema, MergedErrorMap<TErrorMap, U>, TMeta>

  meta: (
    meta: TMeta,
  ) => ContractProcedureBuilderWithoutInputOutputMethods<TInputSchema, TOutputSchema, TErrorMap, TMeta>

  route: (
    route: Route,
  ) => ContractProcedureBuilderWithoutInputOutputMethods<TInputSchema, TOutputSchema, TErrorMap, TMeta>
}

export interface ContractProcedureBuilderWithoutInputMethods<
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
>extends ContractProcedure<TInputSchema, TOutputSchema, TErrorMap, TMeta> {
  errors: <U extends ErrorMap>(
    errors: U,
  ) => ContractProcedureBuilderWithoutInputMethods<TInputSchema, TOutputSchema, MergedErrorMap<TErrorMap, U>, TMeta>

  meta: (
    meta: TMeta,
  ) => ContractProcedureBuilderWithoutInputMethods<TInputSchema, TOutputSchema, TErrorMap, TMeta>

  route: (
    route: Route,
  ) => ContractProcedureBuilderWithoutInputMethods<TInputSchema, TOutputSchema, TErrorMap, TMeta>

  output: <U extends Schema>(
    schema: U,
  ) => ContractProcedureBuilderWithoutInputOutputMethods<TInputSchema, U, TErrorMap, TMeta>
}

export interface ContractProcedureBuilderWithoutOutputMethods<
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> extends ContractProcedure<TInputSchema, TOutputSchema, TErrorMap, TMeta> {
  errors: <U extends ErrorMap>(
    errors: U,
  ) => ContractProcedureBuilderWithoutOutputMethods<TInputSchema, TOutputSchema, MergedErrorMap<TErrorMap, U>, TMeta>

  meta: (
    meta: TMeta,
  ) => ContractProcedureBuilderWithoutOutputMethods<TInputSchema, TOutputSchema, TErrorMap, TMeta>

  route: (
    route: Route,
  ) => ContractProcedureBuilderWithoutOutputMethods<TInputSchema, TOutputSchema, TErrorMap, TMeta>

  input: <U extends Schema>(
    schema: U,
  ) => ContractProcedureBuilderWithoutInputOutputMethods<U, TOutputSchema, TErrorMap, TMeta>
}
