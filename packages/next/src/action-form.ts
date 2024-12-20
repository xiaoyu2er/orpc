import type { Schema, SchemaInput } from '@orpc/contract'
import type { Context, CreateProcedureCallerOptions } from '@orpc/server'
import { createProcedureClient, ORPCError, unlazy } from '@orpc/server'
import { OpenAPIDeserializer } from '@orpc/transformer'
import { forbidden, notFound, unauthorized } from 'next/navigation'

export type FormAction = (input: FormData) => Promise<void>

export function createFormAction<
  TContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TFuncOutput extends SchemaInput<TOutputSchema>,
>(opt: CreateProcedureCallerOptions<TContext, TInputSchema, TOutputSchema, TFuncOutput>): FormAction {
  const caller = createProcedureClient(opt)

  const formAction = async (input: FormData): Promise<void> => {
    try {
      const { default: procedure } = await unlazy(opt.procedure)

      const inputSchema = procedure['~orpc'].contract['~orpc'].InputSchema

      const deserializer = new OpenAPIDeserializer({
        schema: inputSchema?.['~standard'].vendor === 'zod' ? inputSchema as any : undefined,
      })

      const deserializedInput = deserializer.deserializeAsFormData(input)

      await caller(deserializedInput as any)
    }
    catch (e) {
      if (e instanceof ORPCError) {
        if (e.code === 'NOT_FOUND') {
          notFound()
        }

        if (e.code === 'FORBIDDEN') {
          forbidden()
        }

        if (e.code === 'UNAUTHORIZED') {
          unauthorized()
        }
      }

      throw e
    }
  }

  return formAction
}
