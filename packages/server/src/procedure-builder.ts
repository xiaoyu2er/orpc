import { ContractProcedure, HTTPMethod, HTTPPath, Schema, SchemaOutput } from '@orpc/contract'
import { MapInputMiddleware, Middleware } from './middleware'
import { Procedure, ProcedureHandler } from './procedure'
import { ProcedureImplementer } from './procedure-implementer'
import { Context, MergeContext } from './types'

export class ProcedureBuilder<
  TContext extends Context,
  TExtraContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TMethod extends HTTPMethod,
  TPath extends HTTPPath
> {
  constructor(
    public __cpb: {
      contract?: ContractProcedure<TInputSchema, TOutputSchema, TMethod, TPath>
      middlewares?: Middleware<TContext, any, any>[]
    } = {}
  ) {}

  private get contract() {
    return this.__cpb.contract ?? new ContractProcedure()
  }

  /**
   * Self chainable
   */

  route<UMethod extends HTTPMethod = undefined, UPath extends HTTPPath = undefined>(opts: {
    method?: UMethod
    path?: UPath
    summary?: string
    description?: string
    deprecated?: boolean
  }): ProcedureBuilder<TContext, TExtraContext, TInputSchema, TOutputSchema, UMethod, UPath> {
    return new ProcedureBuilder({
      ...this.__cpb,
      contract: this.contract.route(opts),
    })
  }

  summary(
    summary: string
  ): ProcedureBuilder<TContext, TExtraContext, TInputSchema, TOutputSchema, TMethod, TPath> {
    return new ProcedureBuilder({
      ...this.__cpb,
      contract: this.contract.summary(summary),
    })
  }

  description(
    description: string
  ): ProcedureBuilder<TContext, TExtraContext, TInputSchema, TOutputSchema, TMethod, TPath> {
    return new ProcedureBuilder({
      ...this.__cpb,
      contract: this.contract.description(description),
    })
  }

  deprecated(
    deprecated?: boolean
  ): ProcedureBuilder<TContext, TExtraContext, TInputSchema, TOutputSchema, TMethod, TPath> {
    return new ProcedureBuilder({
      ...this.__cpb,
      contract: this.contract.deprecated(deprecated),
    })
  }

  input<USchema extends Schema>(
    schema: USchema,
    example?: SchemaOutput<USchema>,
    examples?: Record<string, SchemaOutput<USchema>>
  ): ProcedureBuilder<TContext, TExtraContext, USchema, TOutputSchema, TMethod, TPath> {
    return new ProcedureBuilder({
      ...this.__cpb,
      contract: this.contract.input(schema, example, examples),
    })
  }

  output<USchema extends Schema>(
    schema: USchema,
    example?: SchemaOutput<USchema>,
    examples?: Record<string, SchemaOutput<USchema>>
  ): ProcedureBuilder<TContext, TExtraContext, TInputSchema, USchema, TMethod, TPath> {
    return new ProcedureBuilder({
      ...this.__cpb,
      contract: this.contract.output(schema, example, examples),
    })
  }

  /**
   * Convert to ProcedureBuilder
   */

  use<UExtraContext extends Partial<MergeContext<Context, MergeContext<TContext, TExtraContext>>>>(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      UExtraContext,
      SchemaOutput<TInputSchema>
    >
  ): ProcedureImplementer<
    TContext,
    ContractProcedure<TInputSchema, TOutputSchema, TMethod, TPath>,
    MergeContext<TExtraContext, UExtraContext>
  >

  use<
    UExtraContext extends Partial<MergeContext<Context, MergeContext<TContext, TExtraContext>>>,
    UMappedInput = SchemaOutput<TInputSchema>
  >(
    middleware: Middleware<MergeContext<TContext, TExtraContext>, UExtraContext, UMappedInput>,
    mapInput: MapInputMiddleware<SchemaOutput<TInputSchema>, UMappedInput>
  ): ProcedureImplementer<
    TContext,
    ContractProcedure<TInputSchema, TOutputSchema, TMethod, TPath>,
    MergeContext<TExtraContext, UExtraContext>
  >

  use(
    middleware: Middleware<any, any, any>,
    mapInput?: MapInputMiddleware<any, any>
  ): ProcedureImplementer<any, any, any> {
    if (!mapInput) {
      return new ProcedureImplementer({
        contract: this.contract,
        middlewares: this.__cpb.middlewares,
      }).use(middleware)
    }

    return new ProcedureImplementer({
      contract: this.contract,
      middlewares: this.__cpb.middlewares,
    }).use(middleware, mapInput)
  }

  /**
   * Convert to Procedure
   */

  handler<UHandlerOutput extends SchemaOutput<TOutputSchema>>(
    handler: ProcedureHandler<
      TContext,
      ContractProcedure<TInputSchema, TOutputSchema, TMethod, TPath>,
      TExtraContext,
      UHandlerOutput
    >
  ): Procedure<
    TContext,
    ContractProcedure<TInputSchema, TOutputSchema, TMethod, TPath>,
    TExtraContext,
    UHandlerOutput
  > {
    return new Procedure({
      middlewares: this.__cpb.middlewares,
      contract: this.contract,
      handler,
    })
  }
}
