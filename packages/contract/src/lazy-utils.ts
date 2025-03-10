import { getLazyMeta, lazy, unlazy, type Lazy } from './lazy'

export function createAssertedDefinedLazy<T>(lazied: Lazy<T>): Lazy<T & ({} | null)> {
    return lazy(async () => {
        const { default: maybeUndefined } = await unlazy(lazied)

        if (maybeUndefined === undefined) {
            throw new Error(`
                Got Lazy<undefined> when expected Lazy<T>.
                This should be caught by TypeScript compilation.
                Please report this issue if this makes you feel uncomfortable.
            `)
        }

        return {default: maybeUndefined}
    }, getLazyMeta(lazied))
}
