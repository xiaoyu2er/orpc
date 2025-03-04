import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { Schema } from './schema'
import { mapEventIterator, ORPCError } from '@orpc/client'
import { isAsyncIteratorObject } from '@orpc/shared'
import { ValidationError } from './error'

const EVENT_ITERATOR_SCHEMA_SYMBOL = Symbol('ORPC_EVENT_ITERATOR_SCHEMA')

export function eventIterator<TYieldIn, TYieldOut, TReturnIn = unknown, TReturnOut = unknown>(
  yields: StandardSchemaV1<TYieldIn, TYieldOut>,
  returns?: StandardSchemaV1<TReturnIn, TReturnOut>,
): StandardSchemaV1<AsyncIteratorObject<TYieldIn, TReturnIn, void>, AsyncIteratorObject<TYieldOut, TReturnOut, void>> {
  return {
    '~standard': {
      [EVENT_ITERATOR_SCHEMA_SYMBOL as any]: { yields, returns } satisfies { yields: Schema, returns: Schema },
      vendor: 'orpc',
      version: 1,
      validate(iterator) {
        if (!isAsyncIteratorObject(iterator)) {
          return { issues: [{ message: 'Expect event iterator', path: [] }] }
        }

        const mapped = mapEventIterator(iterator, {
          async value(value, done) {
            const schema = done ? returns : yields

            if (!schema) {
              return value
            }

            const result = await schema['~standard'].validate(value)

            if (result.issues) {
              throw new ORPCError('EVENT_ITERATOR_VALIDATION_FAILED', {
                message: 'Event iterator validation failed',
                cause: new ValidationError({
                  issues: result.issues,
                  message: 'Event iterator validation failed',
                }),
              })
            }

            return result.value
          },
          error: async error => error,
        })

        return { value: mapped }
      },
    },
  }
}

export function getEventIteratorSchemaDetails(schema: Schema): undefined | { yields: Schema, returns: Schema } {
  if (schema === undefined) {
    return undefined
  }

  return (schema['~standard'] as any)[EVENT_ITERATOR_SCHEMA_SYMBOL]
}
