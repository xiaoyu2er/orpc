/// <reference lib="dom" />

import {
  type CustomErrorParams,
  type ZodType,
  type ZodTypeAny,
  type ZodTypeDef,
  z,
} from 'zod'

export type CustomZodType = 'File' | 'Blob' | 'Invalid Date' | 'RegExp' | 'URL'

const customZodTypeSymbol = Symbol('customZodTypeSymbol')

type CustomParams = CustomErrorParams & {
  fatal?: boolean
}

export function getCustomZodType(
  schema: ZodTypeAny,
): CustomZodType | undefined {
  return schema._def[customZodTypeSymbol] as CustomZodType | undefined
}

export function file(
  options?: CustomParams,
): ZodType<InstanceType<typeof File>, ZodTypeDef, InstanceType<typeof File>> {
  const schema = z.instanceof(File, options)

  Object.assign(schema._def, {
    [customZodTypeSymbol]: 'File' satisfies CustomZodType,
  })

  return schema
}

export function blob(
  options?: CustomParams,
): ZodType<InstanceType<typeof Blob>, ZodTypeDef, InstanceType<typeof Blob>> {
  const schema = z.instanceof(Blob, options)

  Object.assign(schema._def, {
    [customZodTypeSymbol]: 'Blob' satisfies CustomZodType,
  })

  return schema
}

export function invalidDate(
  options?: CustomParams,
): ZodType<Date, ZodTypeDef, Date> {
  const schema = z
    .instanceof(Date, options)
    .refine((v) => Number.isNaN(v.getTime()), {
      message: 'Expected a invalid date but got a valid date',
      ...options,
    })

  Object.assign(schema._def, {
    [customZodTypeSymbol]: 'Invalid Date' satisfies CustomZodType,
  })

  return schema
}

export function regexp(
  options?: CustomParams,
): ZodType<RegExp, ZodTypeDef, RegExp> {
  const schema = z.instanceof(RegExp, options)

  Object.assign(schema._def, {
    [customZodTypeSymbol]: 'RegExp' satisfies CustomZodType,
  })

  return schema
}

export function url(options?: CustomParams): ZodType<URL, ZodTypeDef, URL> {
  const schema = z.instanceof(URL, options)

  Object.assign(schema._def, {
    [customZodTypeSymbol]: 'URL' satisfies CustomZodType,
  })

  return schema
}

export const oz = {
  file,
  blob,
  invalidDate,
  regexp,
  url,
}
