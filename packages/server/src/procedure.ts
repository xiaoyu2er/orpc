import {
  ContractProcedure,
  HTTPMethod,
  HTTPPath,
  PrefixHTTPPath,
  Schema,
  SchemaInput,
  SchemaOutput,
} from '@orpc/contract'
import { Middleware } from './middleware'
import { Context, MergeContext, Meta, Promisable } from './types'

export class Procedure<
  TContext extends Context,
  TContract extends ContractProcedure<any, any, any, any>,
  TExtraContext extends Context,
  THandlerOutput extends TContract extends ContractProcedure<any, infer UOutputSchema, any, any>
    ? SchemaOutput<UOutputSchema>
    : never
> {
  constructor(
    public __p: {
      middlewares?: Middleware<any, any, any, any>[] // TODO:
      contract: TContract
      handler: ProcedureHandler<TContext, TContract, TExtraContext, THandlerOutput>
    }
  ) {}

  prefix<UPrefix extends Exclude<HTTPPath, undefined>>(
    prefix: UPrefix
  ): Procedure<
    TContext,
    TContract extends ContractProcedure<
      infer UInputSchema,
      infer UOutputSchema,
      infer UMethod,
      infer UPath
    >
      ? ContractProcedure<UInputSchema, UOutputSchema, UMethod, PrefixHTTPPath<UPrefix, UPath>>
      : never,
    TExtraContext,
    THandlerOutput
  > {
    return new Procedure({
      ...this.__p,
      contract: this.__p.contract.prefix(prefix) as any,
    })
  }

  // TODO:
  // use<UExtraContext extends Partial<MergeContext<Context, MergeContext<TContext, TExtraContext>>>>(
  //   middleware: Middleware<
  //     MergeContext<TContext, TExtraContext>,
  //     UExtraContext,
  //     TContract extends ContractProcedure<infer UInputSchema, any, any, any>
  //       ? SchemaOutput<UInputSchema>
  //       : never,
  //     THandlerOutput
  //   >
  // ): Procedure<TContext, TContract, MergeContext<TExtraContext, UExtraContext>, THandlerOutput>

  // use<
  //   UExtraContext extends Partial<MergeContext<Context, MergeContext<TContext, TExtraContext>>>,
  //   UMappedInput = TContract extends ContractProcedure<infer UInputSchema, any, any, any>
  //     ? SchemaOutput<UInputSchema>
  //     : never
  // >(
  //   middleware: Middleware<
  //     MergeContext<TContext, TExtraContext>,
  //     UExtraContext,
  //     UMappedInput,
  //     THandlerOutput
  //   >,
  //   mapInput: MapInputMiddleware<
  //     TContract extends ContractProcedure<infer UInputSchema, any, any, any>
  //       ? SchemaOutput<UInputSchema>
  //       : never,
  //     UMappedInput
  //   >
  // ): Procedure<TContext, TContract, MergeContext<TExtraContext, UExtraContext>, THandlerOutput>

  // use(
  //   middleware_: Middleware<any, any, any, any>,
  //   mapInput?: MapInputMiddleware<any, any>
  // ): Procedure<any, any, any, any> {
  //   const middleware: Middleware<any, any, any, any> =
  //     typeof mapInput === 'function'
  //       ? (input, ...rest) => middleware_(mapInput(input), ...rest)
  //       : middleware_

  //   return new Procedure({
  //     ...this.__p,
  //     middlewares: [...(this.__p.middlewares ?? []), middleware],
  //   })
  // }
}

export type ProcedureHandler<
  TContext extends Context,
  TContract extends ContractProcedure<any, any, any, any>,
  TExtraContext extends Context,
  TOutput extends TContract extends ContractProcedure<any, infer UOutputSchema, any, any>
    ? SchemaOutput<UOutputSchema>
    : never
> = {
  (
    input: TContract extends ContractProcedure<infer UInputSchema, any, any, any>
      ? SchemaOutput<UInputSchema>
      : never,
    context: MergeContext<TContext, TExtraContext>,
    meta: Meta
  ): Promisable<
    TContract extends ContractProcedure<any, infer UOutputSchema, any, any>
      ? SchemaInput<UOutputSchema, TOutput>
      : never
  >
}

export type WELL_DEFINED_PROCEDURE = Procedure<
  Context,
  ContractProcedure<Schema, Schema, HTTPMethod, HTTPPath>,
  Context,
  unknown
>

export function isProcedure(item: unknown): item is WELL_DEFINED_PROCEDURE {
  if (item instanceof Procedure) return true

  try {
    const anyItem = item as any
    return typeof anyItem.__p.contract === 'string' && typeof anyItem.__p.handler === 'function'
  } catch {
    return false
  }
}
