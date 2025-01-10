import { isPlainObject } from 'is-what'

export function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error
  }

  if (typeof error === 'string') {
    return new Error(error, { cause: error })
  }

  if (isPlainObject(error)) {
    if ('message' in error && typeof error.message === 'string') {
      return new Error(error.message, { cause: error })
    }

    if ('name' in error && typeof error.name === 'string') {
      return new Error(error.name, { cause: error })
    }
  }

  return new Error('Unknown error', { cause: error })
}
