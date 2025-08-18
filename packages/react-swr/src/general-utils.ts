import type { MaybeOptionalOptions } from '@orpc/shared'
import type { CreateMatcherOptions, Key, Matcher, MatcherStrategy } from './types'
import { resolveMaybeOptionalOptions } from '@orpc/shared'
import { isSubsetOf } from './utils'

export interface GeneralUtils<TInput> {
  matcher<TStrategy extends MatcherStrategy>(
    ...rest: MaybeOptionalOptions<CreateMatcherOptions<TStrategy, TInput>>
  ): Matcher
}

export function createGeneralUtils<TInput>(path: readonly string[]): GeneralUtils<TInput> {
  return {
    matcher(...rest) {
      const { input, strategy = 'partial' } = resolveMaybeOptionalOptions(rest)

      return (key) => {
        const expectedKey = [path, { input }] satisfies Key<unknown>

        if (!isSubsetOf(expectedKey, key)) {
          return false
        }

        if (strategy === 'exact' && !isSubsetOf(key, expectedKey)) {
          return false
        }

        return true
      }
    },
  }
}
