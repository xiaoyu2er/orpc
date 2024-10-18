import { generateMock } from '@anatine/zod-mock'
import { copy } from 'copy-anything'
import { isPlainObject } from 'is-what'
import { smartParse } from '../src/parse'
import { generateRandomZodSchema } from './generate-schema'

it('works', { repeats: 1000 }, () => {
  const depth = Math.floor(Math.random() * 5)
  const schema = generateRandomZodSchema(depth)
  const data = generateMock(schema)

  // if failed, the error come from generator so can bypass it
  if (schema.safeParse(data).error) return
  smartParse(schema, uglyData(data))
})

function uglyData(target: any) {
  if (Array.isArray(target)) return target.map((i) => copy(i))

  if (!isPlainObject(target)) {
    if (Math.random() < 0.7) {
      if (target === undefined) {
        return 'undefined'
      }

      if (target === null) {
        return 'null'
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
