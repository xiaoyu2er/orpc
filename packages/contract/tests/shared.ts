import type { ReadonlyDeep } from '@orpc/shared'
import type { ContractProcedure, StrictErrorMap, StrictRoute } from '../src'
import type { Meta, StrictMeta } from '../src/meta'
import { z } from 'zod'

export const inputSchema = z.object({ input: z.number().transform(n => `${n}`) })

export const outputSchema = z.object({ output: z.number().transform(n => `${n}`) })

// StrictErrorMap and ReadonlyDeep make the type more real like built from oc
export const baseErrorMap: StrictErrorMap<ReadonlyDeep<{ BASE: { data: typeof outputSchema } }>> = {
  BASE: {
    data: outputSchema,
  },
}

// StrictErrorMap and ReadonlyDeep make the type more real like built from oc
export const baseRoute: StrictRoute<ReadonlyDeep<{ path: '/base' }>> = { path: '/base' }

export type BaseMetaDef = { mode?: string, log?: boolean }

// StrictErrorMap and ReadonlyDeep make the type more real like built from oc
export const baseMeta: StrictMeta<BaseMetaDef, ReadonlyDeep<{ mode: 'dev' }>> = {
  mode: 'dev',
}

export const ping = {} as ContractProcedure<
  typeof inputSchema,
  typeof outputSchema,
  typeof baseErrorMap,
  typeof baseRoute,
  BaseMetaDef,
  typeof baseMeta
>

export const pong = {} as ContractProcedure<
  undefined,
  undefined,
  Record<never, never>,
  Record<never, never>,
  Meta,
  Record<never, never>
>
