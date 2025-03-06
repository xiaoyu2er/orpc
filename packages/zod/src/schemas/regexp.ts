import type { ZodType, ZodTypeDef } from 'zod'
import type { CustomParams } from './base'
import { custom } from 'zod'
import { composeParams, setCustomZodDef } from './base'

export function regexp(
  params?: string | CustomParams | ((input: unknown) => CustomParams),
): ZodType<RegExp, ZodTypeDef, RegExp> {
  const schema = custom<RegExp>(
    val => val instanceof RegExp,
    composeParams(
      () => 'Input is not a regexp',
      params,
    ),
  )

  setCustomZodDef(schema._def, { type: 'regexp' })

  return schema
}
