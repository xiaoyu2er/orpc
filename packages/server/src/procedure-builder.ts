import {
  type ContractProcedure,
  DecoratedContractProcedure,
  type HTTPMethod,
  type HTTPPath,
  type Schema,
  type SchemaOutput,
} from '@orpc/contract'
import type { MapInputMiddleware, Middleware } from './middleware'
import { DecoratedProcedure, type ProcedureHandler } from './procedure'
import { ProcedureImplementer } from './procedure-implementer'
import type { Context, MergeContext } from './types'

export class ProcedureBuilder<
  TContext extends Context,
  TExtraContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
> {
  constructor(
    public zz$pb: {
      contract: ContractProcedure<TInputSchema, TOutputSchema>
      middlewares?: Middleware<any, any, any, any>[]
    },
  ) {}

  /**
   * Self chainable
   */

  route(opts: {
    method?: HTTPMethod
    path?: HTTPPath
    summary?: string
    description?: string
    deprecated?: boolean
  }): ProcedureBuilder<TContext, TExtraContext, TInputSchema, TOutputSchema> {
    return new ProcedureBuilder({
      ...this.zz$pb,
      contract: DecoratedContractProcedure.decorate(this.zz$pb.contract).route(
        opts,
      ),
    })
  }

  summary(
    summary: string,
  ): ProcedureBuilder<TContext, TExtraContext, TInputSchema, TOutputSchema> {
    return new ProcedureBuilder({
      ...this.zz$pb,
      contract: DecoratedContractProcedure.decorate(
        this.zz$pb.contract,
      ).summary(summary),
    })
  }

  description(
    description: string,
  ): ProcedureBuilder<TContext, TExtraContext, TInputSchema, TOutputSchema> {
    return new ProcedureBuilder({
      ...this.zz$pb,
      contract: DecoratedContractProcedure.decorate(
        this.zz$pb.contract,
      ).description(description),
    })
  }

  deprecated(
    deprecated = true,
  ): ProcedureBuilder<TContext, TExtraContext, TInputSchema, TOutputSchema> {
    return new ProcedureBuilder({
      ...this.zz$pb,
      contract: DecoratedContractProcedure.decorate(
        this.zz$pb.contract,
      ).deprecated(deprecated),
    })
  }

  input<USchema extends Schema = undefined>(
    schema: USchema,
    example?: SchemaOutput<USchema>,
    examples?: Record<string, SchemaOutput<USchema>>,
  ): ProcedureBuilder<TContext, TExtraContext, USchema, TOutputSchema> {
    return new ProcedureBuilder({
      ...this.zz$pb,
      contract: DecoratedContractProcedure.decorate(this.zz$pb.contract).input(
        schema,
        example,
        examples,
      ),
    })
  }

  output<USchema extends Schema = undefined>(
    schema: USchema,
    example?: SchemaOutput<USchema>,
    examples?: Record<string, SchemaOutput<USchema>>,
  ): ProcedureBuilder<TContext, TExtraContext, TInputSchema, USchema> {
    return new ProcedureBuilder({
      ...this.zz$pb,
      contract: DecoratedContractProcedure.decorate(this.zz$pb.contract).output(
        schema,
        example,
        examples,
      ),
    })
  }

  /**
   * Convert to ProcedureBuilder
   */

  use<
    UExtraContext extends
      | Partial<MergeContext<Context, MergeContext<TContext, TExtraContext>>>
      | undefined = undefined,
  >(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      UExtraContext,
      SchemaOutput<TInputSchema>,
      SchemaOutput<TOutputSchema>
    >,
  ): ProcedureImplementer<
    TContext,
    MergeContext<TExtraContext, UExtraContext>,
    TInputSchema,
    TOutputSchema
  >

  use<
    UExtraContext extends
      | Partial<MergeContext<Context, MergeContext<TContext, TExtraContext>>>
      | undefined = undefined,
    UMappedInput = unknown,
  >(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      UExtraContext,
      UMappedInput,
      SchemaOutput<TOutputSchema>
    >,
    mapInput: MapInputMiddleware<SchemaOutput<TInputSchema>, UMappedInput>,
  ): ProcedureImplementer<
    TContext,
    MergeContext<TExtraContext, UExtraContext>,
    TInputSchema,
    TOutputSchema
  >

  use(
    middleware: Middleware<any, any, any, any>,
    mapInput?: MapInputMiddleware<any, any>,
  ): ProcedureImplementer<any, any, any, any> {
    if (!mapInput) {
      return new ProcedureImplementer({
        contract: this.zz$pb.contract,
        middlewares: this.zz$pb.middlewares,
      }).use(middleware)
    }

    return new ProcedureImplementer({
      contract: this.zz$pb.contract,
      middlewares: this.zz$pb.middlewares,
    }).use(middleware, mapInput)
  }

  /**
   * Convert to Procedure
   */

  handler<UHandlerOutput extends SchemaOutput<TOutputSchema>>(
    handler: ProcedureHandler<
      TContext,
      TExtraContext,
      TInputSchema,
      TOutputSchema,
      UHandlerOutput
    >,
  ): DecoratedProcedure<
    TContext,
    TExtraContext,
    TInputSchema,
    TOutputSchema,
    UHandlerOutput
  > {
    return new DecoratedProcedure({
      middlewares: this.zz$pb.middlewares,
      contract: this.zz$pb.contract,
      handler,
    })
  }
}
