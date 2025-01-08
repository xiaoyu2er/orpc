import type { ErrorMap, HTTPPath, RouteOptions, Schema, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { ErrorFromErrorMap } from './error'
import type { ORPCErrorConstructorMap } from './error-map'
import type { ANY_MIDDLEWARE, MapInputMiddleware, Middleware } from './middleware'
import type { ProcedureClient } from './procedure-client'
import type { Context, MergeContext } from './types'
import { DecoratedContractProcedure } from '@orpc/contract'
import { decorateMiddleware } from './middleware-decorated'
import { Procedure } from './procedure'
import { createProcedureClient } from './procedure-client'

export type DecoratedProcedure<
  TContext extends Context,
  TExtraContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  THandlerOutput extends SchemaInput<TOutputSchema>,
  TErrorMap extends ErrorMap,
> =
  & Procedure<TContext, TExtraContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap>
  & {
    prefix: (
      prefix: HTTPPath,
    ) => DecoratedProcedure<TContext, TExtraContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap>

    route: (
      route: RouteOptions,
    ) => DecoratedProcedure<TContext, TExtraContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap>

    use:
    & (
      <U extends Context & Partial<MergeContext<TContext, TExtraContext>> | undefined = undefined>(
        middleware: Middleware<
          MergeContext<TContext, TExtraContext>,
          U,
          SchemaOutput<TInputSchema>,
          SchemaInput<TOutputSchema, THandlerOutput>,
          ORPCErrorConstructorMap<TErrorMap>
        >,
      ) => DecoratedProcedure<
        TContext,
        MergeContext<TExtraContext, U>,
        TInputSchema,
        TOutputSchema,
        THandlerOutput,
        TErrorMap
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
          SchemaInput<TOutputSchema, THandlerOutput>,
          ORPCErrorConstructorMap<TErrorMap>
        >,
        mapInput: MapInputMiddleware<
          SchemaOutput<TInputSchema, THandlerOutput>,
          UInput
        >,
      ) => DecoratedProcedure<
        TContext,
        MergeContext<TExtraContext, UExtra>,
        TInputSchema,
        TOutputSchema,
        THandlerOutput,
        TErrorMap
      >
    )

    unshiftTag: (...tags: string[]) => DecoratedProcedure<TContext, TExtraContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap>

    unshiftMiddleware: <U extends Context & Partial<MergeContext<TContext, TExtraContext>> | undefined = undefined>(
      ...middlewares: Middleware<TContext, U, SchemaOutput<TInputSchema>, SchemaInput<TOutputSchema, THandlerOutput>, ORPCErrorConstructorMap<TErrorMap>>[]
    ) => DecoratedProcedure<TContext, TExtraContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap>

  }
  & (undefined extends TContext ? ProcedureClient<unknown, SchemaInput<TInputSchema>, SchemaOutput<TOutputSchema, THandlerOutput>, ErrorFromErrorMap<TErrorMap>> : unknown)

export function decorateProcedure<
  TContext extends Context,
  TExtraContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  THandlerOutput extends SchemaInput<TOutputSchema>,
  TErrorMap extends ErrorMap,
>(
  procedure: Procedure<TContext, TExtraContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap>,
): DecoratedProcedure<TContext, TExtraContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap> {
  const caller = createProcedureClient({
    procedure,
    context: undefined as any,
  })

  const decorated = caller as DecoratedProcedure<TContext, TExtraContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap>

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

  decorated.use = (middleware: Middleware<any, any, any, any, any>, mapInput?: MapInputMiddleware<any, any>) => {
    const middleware_ = mapInput
      ? decorateMiddleware(middleware).mapInput(mapInput)
      : middleware

    return decorateProcedure(new Procedure({
      ...procedure['~orpc'],
      middlewares: [...(procedure['~orpc'].middlewares ?? []), middleware_],
    })) as any
  }

  decorated.unshiftTag = (...tags) => {
    return decorateProcedure(new Procedure({
      ...procedure['~orpc'],
      contract: DecoratedContractProcedure.decorate(procedure['~orpc'].contract).unshiftTag(...tags),
    }))
  }

  decorated.unshiftMiddleware = (...middlewares: ANY_MIDDLEWARE[]) => {
    if (procedure['~orpc'].middlewares?.length) {
      let min = 0

      for (let i = 0; i < procedure['~orpc'].middlewares.length; i++) {
        const index = middlewares.indexOf(procedure['~orpc'].middlewares[i]!, min)

        if (index === -1) {
          middlewares.push(...procedure['~orpc'].middlewares.slice(i))
          break
        }

        min = index + 1
      }
    }

    return decorateProcedure(new Procedure({
      ...procedure['~orpc'],
      middlewares,
    }))
  }

  return decorated
}
