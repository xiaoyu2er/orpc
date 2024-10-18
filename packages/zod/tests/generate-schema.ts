import { z } from 'zod'

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

  // biome-ignore lint/style/noNonNullAssertion: for sure
  const selectedSchema = schemas[Math.floor(Math.random() * schemas.length)]!
  return selectedSchema()
}
