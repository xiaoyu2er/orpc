import {
  ContractProcedure,
  type HTTPMethod,
  type HTTPPath,
  type Schema,
  type SchemaOutput,
} from '@orpc/contract'
import type { MapInputMiddleware, Middleware } from './middleware'
import { Procedure, type ProcedureHandler } from './procedure'
import { ProcedureImplementer } from './procedure-implementer'
import type { Context, MergeContext } from './types'

export class ProcedureBuilder<
  TContext extends Context,
  TExtraContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TMethod extends HTTPMethod,
  TPath extends HTTPPath,
> {
  constructor(
    public __pb: {
      contract?: ContractProcedure<TInputSchema, TOutputSchema, TMethod, TPath>
      middlewares?: Middleware<TContext, any, any, any>[]
    } = {},
  ) {}

  private get contract() {
    return this.__pb.contract ?? new ContractProcedure()
  }

  /**
   * Self chainable
   */

  route<
    UMethod extends HTTPMethod = undefined,
    UPath extends HTTPPath = undefined,
  >(opts: {
    method?: UMethod
    path?: UPath
    summary?: string
    description?: string
    deprecated?: boolean
  }): ProcedureBuilder<
    TContext,
    TExtraContext,
    TInputSchema,
    TOutputSchema,
    UMethod,
    UPath
  > {
    return new ProcedureBuilder({
      ...this.__pb,
      contract: this.contract.route(opts),
    })
  }

  summary(
    summary: string,
  ): ProcedureBuilder<
    TContext,
    TExtraContext,
    TInputSchema,
    TOutputSchema,
    TMethod,
    TPath
  > {
    return new ProcedureBuilder({
      ...this.__pb,
      contract: this.contract.summary(summary),
    })
  }

  description(
    description: string,
  ): ProcedureBuilder<
    TContext,
    TExtraContext,
    TInputSchema,
    TOutputSchema,
    TMethod,
    TPath
  > {
    return new ProcedureBuilder({
      ...this.__pb,
      contract: this.contract.description(description),
    })
  }

  deprecated(
    deprecated?: boolean,
  ): ProcedureBuilder<
    TContext,
    TExtraContext,
    TInputSchema,
    TOutputSchema,
    TMethod,
    TPath
  > {
    return new ProcedureBuilder({
      ...this.__pb,
      contract: this.contract.deprecated(deprecated),
    })
  }

  input<USchema extends Schema = undefined>(
    schema: USchema,
    example?: SchemaOutput<USchema>,
    examples?: Record<string, SchemaOutput<USchema>>,
  ): ProcedureBuilder<
    TContext,
    TExtraContext,
    USchema,
    TOutputSchema,
    TMethod,
    TPath
  > {
    return new ProcedureBuilder({
      ...this.__pb,
      contract: this.contract.input(schema, example, examples),
    })
  }

  output<USchema extends Schema = undefined>(
    schema: USchema,
    example?: SchemaOutput<USchema>,
    examples?: Record<string, SchemaOutput<USchema>>,
  ): ProcedureBuilder<
    TContext,
    TExtraContext,
    TInputSchema,
    USchema,
    TMethod,
    TPath
  > {
    return new ProcedureBuilder({
      ...this.__pb,
      contract: this.contract.output(schema, example, examples),
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
    ContractProcedure<TInputSchema, TOutputSchema, TMethod, TPath>,
    MergeContext<TExtraContext, UExtraContext>
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
    ContractProcedure<TInputSchema, TOutputSchema, TMethod, TPath>,
    MergeContext<TExtraContext, UExtraContext>
  >

  use(
    middleware: Middleware<any, any, any, any>,
    mapInput?: MapInputMiddleware<any, any>,
  ): ProcedureImplementer<any, any, any> {
    if (!mapInput) {
      return new ProcedureImplementer({
        contract: this.contract,
        middlewares: this.__pb.middlewares,
      }).use(middleware)
    }

    return new ProcedureImplementer({
      contract: this.contract,
      middlewares: this.__pb.middlewares,
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
    >,
  ): Procedure<
    TContext,
    ContractProcedure<TInputSchema, TOutputSchema, TMethod, TPath>,
    TExtraContext,
    UHandlerOutput
  > {
    return new Procedure({
      middlewares: this.__pb.middlewares,
      contract: this.contract,
      handler,
    })
  }
}
