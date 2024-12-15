import type { HTTPPath, RouteOptions, Schema, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { MapInputMiddleware, Middleware } from './middleware'
import type { ProcedureCaller } from './procedure-caller'
import type { Context, MergeContext } from './types'
import { DecoratedContractProcedure } from '@orpc/contract'
import { decorateMiddleware } from './middleware'
import { Procedure } from './procedure'
import { createProcedureCaller } from './procedure-caller'

export type DecoratedProcedure<
  TContext extends Context,
  TExtraContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TFuncOutput extends SchemaInput<TOutputSchema>,
> =
  & Procedure<TContext, TExtraContext, TInputSchema, TOutputSchema, TFuncOutput>
  & {
    prefix: (
      prefix: HTTPPath,
    ) => DecoratedProcedure<TContext, TExtraContext, TInputSchema, TOutputSchema, TFuncOutput>

    route: (
      route: RouteOptions,
    ) => DecoratedProcedure<TContext, TExtraContext, TInputSchema, TOutputSchema, TFuncOutput>

    unshiftTag: (...tags: string[]) => DecoratedProcedure<TContext, TExtraContext, TInputSchema, TOutputSchema, TFuncOutput>

    unshiftMiddleware: (...middlewares: Middleware<TContext, any, any, any>[]) => DecoratedProcedure<TContext, TExtraContext, TInputSchema, TOutputSchema, TFuncOutput>

    use:
    & (
      <U extends Context & Partial<MergeContext<TContext, TExtraContext>> | undefined = undefined>(
        middleware: Middleware<
          MergeContext<TContext, TExtraContext>,
          U,
          SchemaOutput<TInputSchema>,
          SchemaInput<TOutputSchema, TFuncOutput>
        >,
      ) => DecoratedProcedure<
        TContext,
        MergeContext<TExtraContext, U>,
        TInputSchema,
        TOutputSchema,
        TFuncOutput
      >
    )
    & (
      <
        UExtra extends Context & Partial<MergeContext<TContext, TExtraContext>> | undefined = undefined,
        UInput = unknown,
      >(
        middleware: Middleware<
          MergeContext<TContext, TExtraContext>,
          UExtra,
          UInput,
          SchemaInput<TOutputSchema, TFuncOutput>
        >,
        mapInput: MapInputMiddleware<
          SchemaOutput<TInputSchema, TFuncOutput>,
          UInput
        >,
      ) => DecoratedProcedure<
        TContext,
        MergeContext<TExtraContext, UExtra>,
        TInputSchema,
        TOutputSchema,
        TFuncOutput
      >
    )
  }
  & (undefined extends TContext ? ProcedureCaller<TInputSchema, TOutputSchema, TFuncOutput> : unknown)

export function decorateProcedure<
  TContext extends Context,
  TExtraContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TFuncOutput extends SchemaOutput<TOutputSchema>,
>(
  procedure: Procedure<
    TContext,
    TExtraContext,
    TInputSchema,
    TOutputSchema,
    TFuncOutput
  >,
): DecoratedProcedure<TContext, TExtraContext, TInputSchema, TOutputSchema, TFuncOutput > {
  const caller = createProcedureCaller({
    procedure: procedure as any,
    context: undefined as any,
  })

  const decorated = caller as DecoratedProcedure<TContext, TExtraContext, TInputSchema, TOutputSchema, TFuncOutput>

  decorated['~type'] = procedure['~type']
  decorated['~orpc'] = procedure['~orpc']

  decorated.prefix = (prefix) => {
    return decorateProcedure(new Procedure({
      ...procedure['~orpc'],
      contract: DecoratedContractProcedure.decorate(procedure['~orpc'].contract).prefix(prefix),
    }))
  }

  decorated.route = (route) => {
    return decorateProcedure(new Procedure({
      ...procedure['~orpc'],
      contract: DecoratedContractProcedure.decorate(procedure['~orpc'].contract).route(route),
    }))
  }

  decorated.unshiftTag = (...tags) => {
    return decorateProcedure(new Procedure({
      ...procedure['~orpc'],
      contract: DecoratedContractProcedure.decorate(procedure['~orpc'].contract).unshiftTag(...tags),
    }))
  }

  decorated.unshiftMiddleware = (...middlewares) => {
    return decorateProcedure(new Procedure({
      ...procedure['~orpc'],
      middlewares: [...middlewares, ...(procedure['~orpc'].middlewares ?? [])],
    }))
  }

  decorated.use = (middleware: Middleware<any, any, any, any>, mapInput?: MapInputMiddleware<any, any>) => {
    const middleware_ = mapInput
      ? decorateMiddleware(middleware).mapInput(mapInput)
      : middleware

    return decorateProcedure(new Procedure({
      ...procedure['~orpc'],
      middlewares: [middleware_, ...(procedure['~orpc'].middlewares ?? [])],
    })) as any
  }

  return decorated
}
