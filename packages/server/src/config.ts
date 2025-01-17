const DEFAULT_CONFIG = {
  initialInputValidationIndex: 0,
  initialOutputValidationIndex: 0,
}

export function fallbackConfig<T extends keyof typeof DEFAULT_CONFIG>(
  name: T,
  value?: typeof DEFAULT_CONFIG[T],
): typeof DEFAULT_CONFIG[T] {
  if (value === undefined) {
    return DEFAULT_CONFIG[name]
  }

  return value
}
