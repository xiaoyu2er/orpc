const NATIVE_FUNCTION_REGEX = /^\s*function\s*\(\)\s*\{\s*\[native code\]\s*\}\s*$/

/**
 * Prevents objects from being awaitable by intercepting the `then` method
 * when called by the native await mechanism. This is useful for preventing
 * accidental awaiting of objects that aren't meant to be promises.
 */
export function preventNativeAwait<T extends object>(target: T): T {
  return new Proxy(target, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)

      if (prop !== 'then' || typeof value !== 'function') {
        return value
      }

      return new Proxy(value, {
        apply(targetFn, thisArg, args) {
          /**
           * Do nothing if .then not triggered by `await`
           */
          if (
            args.length !== 2
            || args.some(arg => typeof arg !== 'function' || !NATIVE_FUNCTION_REGEX.test(arg.toString()))
          ) {
            return Reflect.apply(targetFn, thisArg, args)
          }

          let shouldOmit = true
          args[0].call(thisArg, preventNativeAwait(new Proxy(target, {
            get: (target, prop, receiver) => {
              /**
               * Only omit `then` once, in `await` resolution, afterwards it should become normal
               */
              if (shouldOmit && prop === 'then') {
                shouldOmit = false
                return undefined
              }

              return Reflect.get(target, prop, receiver)
            },
          })))
        },
      })
    },
  })
}
