import { generateMock } from '@anatine/zod-mock'
import { copy } from 'copy-anything'
import { isPlainObject } from 'is-what'
import { z } from 'zod'
import { coerceParse } from './zod-coerce-parse'

it('sync', { repeats: 1000 }, () => {
  const schema = generateRandomZodSchema(3)
  const data = generateMock(schema)

  // if failed, the error come from generator so can bypass it
  if (schema.safeParse(data).error) return
  coerceParse(schema, uglyData(data), { bracketNotation: true })
})

function uglyData(target: any) {
  if (Array.isArray(target)) return target.map((i) => copy(i))

  if (!isPlainObject(target)) {
    if (Math.random() < 0.7) {
      if (target === null) {
        return undefined
      }

      if (Number.isNaN(target)) {
        return undefined
      }

      if (target === true) {
        return 'true'
      }

      if (target === false) {
        return 'false'
      }

      if (typeof target === 'string') {
        return target
      }

      if (typeof target === 'number') {
        return `${target}`
      }

      if (target instanceof Date) {
        return Math.random() < 0.5 ? target.toISOString() : target.getTime()
      }

      if (target instanceof Set) {
        return Array.from(target)
      }

      if (target instanceof Map) {
        return Array.from(target.entries())
      }
    }
    return target
  }

  return Object.keys(target).reduce((carry, key) => {
    const val = target[key]
    carry[key] = copy(val)
    return carry
  }, {} as any)
}

export function generateRandomZodSchema(depth = 0): z.ZodTypeAny {
  const maxDepth = 3 // Prevent infinite recursion
  const schemas = [
    () => z.string(),
    () => z.number(),
    () => z.boolean(),
    () => z.null(),
    () => z.undefined(),
    () => z.array(generateRandomZodSchema(depth + 1)),
    () =>
      z.object({
        [Math.random().toString(36).substring(7)]: generateRandomZodSchema(
          depth + 1,
        ),
        [Math.random().toString(36).substring(7)]: generateRandomZodSchema(
          depth + 1,
        ),
      }),
    () => z.enum(['A', 'B', 'C']),
    () =>
      z.union([
        generateRandomZodSchema(depth + 1),
        generateRandomZodSchema(depth + 1),
      ]),
    () => z.record(z.string(), generateRandomZodSchema(depth + 1)),
    () =>
      z.tuple([
        generateRandomZodSchema(depth + 1),
        generateRandomZodSchema(depth + 1),
      ]),
    () =>
      z.intersection(
        z.object({
          [Math.random().toString(36).substring(7)]: generateRandomZodSchema(
            depth + 1,
          ),
        }),
        z.object({
          [Math.random().toString(36).substring(7)]: generateRandomZodSchema(
            depth + 1,
          ),
        }),
      ),
  ]

  // Add recursive schema with a lower probability to avoid too complex structures
  if (depth < maxDepth && Math.random() < 0.3) {
    schemas.push(
      () =>
        z.lazy(() =>
          z.object({
            [Math.random().toString(36).substring(7)]: generateRandomZodSchema(
              depth + 1,
            ),
            children: z.array(z.lazy(() => generateRandomZodSchema(depth + 1))),
          }),
        ) as any,
    )
  }

  const selectedSchema = schemas[Math.floor(Math.random() * schemas.length)]!
  return selectedSchema()
}
