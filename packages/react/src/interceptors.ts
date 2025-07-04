import { onError, onFinish, onStart, onSuccess } from '@orpc/shared'

export { onError, onFinish, onStart, onSuccess }

/**
 * Like `onStart`, but ensure callbacks are executed outside of React's transition.
 */
export const onStartDeferred: typeof onStart = (callback, ...rest) => {
  return onStart((...args) => {
    setTimeout(() => {
      callback(...args)
    }, 10)
  }, ...rest)
}

/**
 * Like `onSuccess`, but ensure callbacks are executed outside of React's transition.
 */
export const onSuccessDeferred: typeof onSuccess = (callback, ...rest) => {
  return onSuccess((...args) => {
    setTimeout(() => {
      callback(...args)
    }, 10)
  }, ...rest)
}

/**
 * Like `onError`, but ensure callbacks are executed outside of React's transition.
 */
export const onErrorDeferred: typeof onError = (callback, ...rest) => {
  return onError((...args) => {
    setTimeout(() => {
      callback(...args)
    }, 10)
  }, ...rest)
}

/**
 * Like `onFinish`, but ensure callbacks are executed outside of React's transition.
 */
export const onFinishDeferred: typeof onFinish = (callback, ...rest) => {
  return onFinish((...args) => {
    setTimeout(() => {
      callback(...args)
    }, 10)
  }, ...rest)
}
