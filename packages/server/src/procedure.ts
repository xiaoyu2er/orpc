import type { Promisable } from '@orpc/shared'
import type { Context, MergeContext, Meta } from './types'
import {
  type ContractProcedure,
  DecoratedContractProcedure,
  type HTTPPath,
  isContractProcedure,
  type RouteOptions,
  type Schema,
  type SchemaInput,
  type SchemaOutput,
} from '@orpc/contract'
import { OpenAPIDeserializer } from '@orpc/transformer'
import {
  decorateMiddleware,
  type MapInputMiddleware,
  type Middleware,
} from './middleware'
import { createProcedureCaller } from './procedure-caller'

export class Procedure<
  TContext extends Context,
  TExtraContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  THandlerOutput extends SchemaOutput<TOutputSchema>,
> {
  constructor(
    public zz$p: {
      middlewares?: Middleware<any, any, any, any>[]
      contract: ContractProcedure<TInputSchema, TOutputSchema>
      handler: ProcedureHandler<
        TContext,
        TExtraContext,
        TInputSchema,
        TOutputSchema,
        THandlerOutput
      >
    },
  ) {}
}

export type DecoratedProcedure<
  TContext extends Context,
  TExtraContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  THandlerOutput extends SchemaOutput<TOutputSchema>,
> = Procedure<
  TContext,
  TExtraContext,
  TInputSchema,
  TOutputSchema,
  THandlerOutput
> & {
  prefix: (
    prefix: HTTPPath,
  ) => DecoratedProcedure<
    TContext,
    TExtraContext,
    TInputSchema,
    TOutputSchema,
    THandlerOutput
  >

  route: (
    opts: RouteOptions,
  ) => DecoratedProcedure<
    TContext,
    TExtraContext,
    TInputSchema,
    TOutputSchema,
    THandlerOutput
  >

  use: (<
    UExtraContext extends
    | Partial<MergeContext<Context, MergeContext<TContext, TExtraContext>>>
    | undefined = undefined,
  >(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      UExtraContext,
      SchemaOutput<TInputSchema>,
      SchemaInput<TOutputSchema, THandlerOutput>
    >,
  ) => DecoratedProcedure<
    TContext,
    MergeContext<TExtraContext, UExtraContext>,
    TInputSchema,
    TOutputSchema,
    THandlerOutput
  >) & (<
    UExtraContext extends
    | Partial<MergeContext<Context, MergeContext<TContext, TExtraContext>>>
    | undefined = undefined,
    UMappedInput = unknown,
  >(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      UExtraContext,
      UMappedInput,
      SchemaInput<TOutputSchema, THandlerOutput>
    >,
    mapInput: MapInputMiddleware<
      SchemaOutput<TInputSchema, THandlerOutput>,
      UMappedInput
    >,
  ) => DecoratedProcedure<
    TContext,
    MergeContext<TExtraContext, UExtraContext>,
    TInputSchema,
    TOutputSchema,
    THandlerOutput
  >)
} & (undefined extends TContext
  ? (
      input: SchemaInput<TInputSchema> | FormData,
    ) => Promise<SchemaOutput<TOutputSchema, THandlerOutput>>
  : unknown)

export interface ProcedureHandler<
  TContext extends Context,
  TExtraContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TOutput extends SchemaOutput<TOutputSchema>,
> {
  (
    input: SchemaOutput<TInputSchema>,
    context: MergeContext<TContext, TExtraContext>,
    meta: Meta,
  ): Promisable<SchemaInput<TOutputSchema, TOutput>>
}

const DECORATED_PROCEDURE_SYMBOL = Symbol('DECORATED_PROCEDURE')

export function decorateProcedure<
  TContext extends Context,
  TExtraContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  THandlerOutput extends SchemaOutput<TOutputSchema>,
>(
  procedure: Procedure<
    TContext,
    TExtraContext,
    TInputSchema,
    TOutputSchema,
    THandlerOutput
  >,
): DecoratedProcedure<
    TContext,
    TExtraContext,
    TInputSchema,
    TOutputSchema,
    THandlerOutput
  > {
  if (DECORATED_PROCEDURE_SYMBOL in procedure) {
    return procedure as any
  }

  const serverAction = async (input: unknown): Promise<SchemaOutput<TOutputSchema, THandlerOutput>> => {
    const input_ = (() => {
      if (!(input instanceof FormData))
        return input

      const transformer = new OpenAPIDeserializer({
        schema: procedure.zz$p.contract.zz$cp.InputSchema,
      })

      return transformer.deserializeAsFormData(input)
    })()

    const procedureCaller = createProcedureCaller({
      procedure,
      context: undefined as any,
      internal: false,
      validate: true,
    })

    return await procedureCaller(input_ as any)
  }

  return Object.assign(serverAction, {
    [DECORATED_PROCEDURE_SYMBOL]: true,
    zz$p: procedure.zz$p,

    prefix(prefix: HTTPPath) {
      return decorateProcedure({
        zz$p: {
          ...procedure.zz$p,
          contract: DecoratedContractProcedure.decorate(
            procedure.zz$p.contract,
          ).prefix(prefix),
        },
      })
    },

    route(opts: RouteOptions) {
      return decorateProcedure({
        zz$p: {
          ...procedure.zz$p,
          contract: DecoratedContractProcedure.decorate(
            procedure.zz$p.contract,
          ).route(opts),
        },
      })
    },

    use(
      middleware: Middleware<any, any, any, any>,
      mapInput?: MapInputMiddleware<any, any>,
    ) {
      const middleware_ = mapInput
        ? decorateMiddleware(middleware).mapInput(mapInput)
        : middleware

      return decorateProcedure({
        zz$p: {
          ...procedure.zz$p,
          middlewares: [middleware_, ...(procedure.zz$p.middlewares ?? [])],
        },
      })
    },
  }) as any
}

export type WELL_DEFINED_PROCEDURE = Procedure<
  Context,
  Context,
  Schema,
  Schema,
  unknown
>

export function isProcedure(item: unknown): item is WELL_DEFINED_PROCEDURE {
  if (item instanceof Procedure)
    return true

  return (
    (typeof item === 'object' || typeof item === 'function')
    && item !== null
    && 'zz$p' in item
    && typeof item.zz$p === 'object'
    && item.zz$p !== null
    && 'contract' in item.zz$p
    && isContractProcedure(item.zz$p.contract)
    && 'handler' in item.zz$p
    && typeof item.zz$p.handler === 'function'
  )
}
