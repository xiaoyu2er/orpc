import { ContractProcedure, Schema, SchemaOutput } from '@orpc/contract'
import { MapInputMiddleware, Middleware } from './middleware'
import { Procedure, ProcedureHandler } from './procedure'
import { ProcedureImplementer } from './procedure-implementer'
import { Context, MergeContext } from './types'

export class ProcedureBuilder<
  TContext extends Context,
  TExtraContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema
> {
  constructor(
    public __cpb: {
      contract?: ContractProcedure<TInputSchema, TOutputSchema>
      middlewares?: Middleware<TContext, any, any>[]
    } = {}
  ) {}

  private get contract() {
    return this.__cpb.contract ?? new ContractProcedure()
  }

  /**
   * Self chainable
   */

  route(
    ...args: Parameters<ContractProcedure<TInputSchema, TOutputSchema>['route']>
  ): ProcedureBuilder<TContext, TExtraContext, TInputSchema, TOutputSchema> {
    return new ProcedureBuilder({
      ...this.__cpb,
      contract: this.contract.route(...args),
    })
  }

  summary(
    ...args: Parameters<ContractProcedure<TInputSchema, TOutputSchema>['summary']>
  ): ProcedureBuilder<TContext, TExtraContext, TInputSchema, TOutputSchema> {
    return new ProcedureBuilder({
      ...this.__cpb,
      contract: this.contract.summary(...args),
    })
  }

  description(
    ...args: Parameters<ContractProcedure<TInputSchema, TOutputSchema>['description']>
  ): ProcedureBuilder<TContext, TExtraContext, TInputSchema, TOutputSchema> {
    return new ProcedureBuilder({
      ...this.__cpb,
      contract: this.contract.description(...args),
    })
  }

  deprecated(
    ...args: Parameters<ContractProcedure<TInputSchema, TOutputSchema>['deprecated']>
  ): ProcedureBuilder<TContext, TExtraContext, TInputSchema, TOutputSchema> {
    return new ProcedureBuilder({
      ...this.__cpb,
      contract: this.contract.deprecated(...args),
    })
  }

  input<USchema extends Schema>(
    schema: USchema,
    example?: SchemaOutput<USchema>,
    examples?: Record<string, SchemaOutput<USchema>>
  ): ProcedureBuilder<TContext, TExtraContext, USchema, TOutputSchema> {
    return new ProcedureBuilder({
      ...this.__cpb,
      contract: this.contract.input(schema, example, examples),
    })
  }

  output<USchema extends Schema>(
    schema: USchema,
    example?: SchemaOutput<USchema>,
    examples?: Record<string, SchemaOutput<USchema>>
  ): ProcedureBuilder<TContext, TExtraContext, TInputSchema, USchema> {
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
    ContractProcedure<TInputSchema, TOutputSchema>,
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
    ContractProcedure<TInputSchema, TOutputSchema>,
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
      ContractProcedure<TInputSchema, TOutputSchema>,
      TExtraContext,
      UHandlerOutput
    >
  ): Procedure<
    TContext,
    ContractProcedure<TInputSchema, TOutputSchema>,
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
