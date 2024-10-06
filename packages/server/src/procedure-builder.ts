import {
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
    public zzProcedureBuilder: {
      path?: HTTPPath
      method?: HTTPMethod
      summary?: string
      description?: string
      deprecated?: boolean
      InputSchema: TInputSchema
      inputExample?: SchemaOutput<TInputSchema>
      inputExamples?: Record<string, SchemaOutput<TInputSchema>>
      OutputSchema: TOutputSchema
      outputExample?: SchemaOutput<TOutputSchema>
      outputExamples?: Record<string, SchemaOutput<TOutputSchema>>
      middlewares?: Middleware<TContext, any, any, any>[]
    },
  ) {}

  private get contract(): DecoratedContractProcedure<
    TInputSchema,
    TOutputSchema
  > {
    return new DecoratedContractProcedure(this.zzProcedureBuilder)
  }

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
      ...this.zzProcedureBuilder,
      ...opts,
      method: opts.method,
      path: opts.path,
    })
  }

  summary(
    summary: string,
  ): ProcedureBuilder<TContext, TExtraContext, TInputSchema, TOutputSchema> {
    return new ProcedureBuilder({
      ...this.zzProcedureBuilder,
      summary,
    })
  }

  description(
    description: string,
  ): ProcedureBuilder<TContext, TExtraContext, TInputSchema, TOutputSchema> {
    return new ProcedureBuilder({
      ...this.zzProcedureBuilder,
      description,
    })
  }

  deprecated(
    deprecated = true,
  ): ProcedureBuilder<TContext, TExtraContext, TInputSchema, TOutputSchema> {
    return new ProcedureBuilder({
      ...this.zzProcedureBuilder,
      deprecated,
    })
  }

  input<USchema extends Schema = undefined>(
    schema: USchema,
    example?: SchemaOutput<USchema>,
    examples?: Record<string, SchemaOutput<USchema>>,
  ): ProcedureBuilder<TContext, TExtraContext, USchema, TOutputSchema> {
    return new ProcedureBuilder({
      ...this.zzProcedureBuilder,
      InputSchema: schema,
      inputExample: example,
      inputExamples: examples,
    })
  }

  output<USchema extends Schema = undefined>(
    schema: USchema,
    example?: SchemaOutput<USchema>,
    examples?: Record<string, SchemaOutput<USchema>>,
  ): ProcedureBuilder<TContext, TExtraContext, TInputSchema, USchema> {
    return new ProcedureBuilder({
      ...this.zzProcedureBuilder,
      OutputSchema: schema,
      outputExample: example,
      outputExamples: examples,
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
    DecoratedContractProcedure<TInputSchema, TOutputSchema>,
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
    DecoratedContractProcedure<TInputSchema, TOutputSchema>,
    MergeContext<TExtraContext, UExtraContext>
  >

  use(
    middleware: Middleware<any, any, any, any>,
    mapInput?: MapInputMiddleware<any, any>,
  ): ProcedureImplementer<any, any, any> {
    if (!mapInput) {
      return new ProcedureImplementer({
        contract: this.contract,
        middlewares: this.zzProcedureBuilder.middlewares,
      }).use(middleware)
    }

    return new ProcedureImplementer({
      contract: this.contract,
      middlewares: this.zzProcedureBuilder.middlewares,
    }).use(middleware, mapInput)
  }

  /**
   * Convert to Procedure
   */

  handler<UHandlerOutput extends SchemaOutput<TOutputSchema>>(
    handler: ProcedureHandler<
      TContext,
      DecoratedContractProcedure<TInputSchema, TOutputSchema>,
      TExtraContext,
      UHandlerOutput
    >,
  ): DecoratedProcedure<
    TContext,
    DecoratedContractProcedure<TInputSchema, TOutputSchema>,
    TExtraContext,
    UHandlerOutput
  > {
    return new DecoratedProcedure({
      middlewares: this.zzProcedureBuilder.middlewares,
      contract: this.contract,
      handler,
    })
  }
}
