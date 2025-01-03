import type { HTTPMethod, InputStructure } from './types'

export interface ORPCConfig {
  /**
   * @default 'POST'
   */
  defaultMethod?: HTTPMethod

  /**
   *
   * @default 200
   */
  defaultSuccessStatus?: number

  /**
   *
   * @default 'compact'
   */
  defaultInputStructure?: InputStructure

  /**
   *
   * @default 'compact'
   */
  defaultOutputStructure?: InputStructure
}

const DEFAULT_CONFIG: Required<ORPCConfig> = {
  defaultMethod: 'POST',
  defaultSuccessStatus: 200,
  defaultInputStructure: 'compact',
  defaultOutputStructure: 'compact',
}

const GLOBAL_CONFIG: Required<ORPCConfig> = {
  ...DEFAULT_CONFIG,
}

/**
 * Set the global configuration, this configuration can effect entire project
 * If value is undefined, it will use the default value
 */
export function configGlobal(config: ORPCConfig): void {
  for (const [key, value] of Object.entries(config)) {
    Reflect.set(GLOBAL_CONFIG, key, value !== undefined ? value : DEFAULT_CONFIG[key as keyof typeof DEFAULT_CONFIG])
  }
}

/**
 * Fallback the value to the global config if it is undefined
 */
export function fallbackToGlobalConfig<T extends keyof ORPCConfig>(key: T, value: ORPCConfig[T]): Exclude<ORPCConfig[T], undefined> {
  if (value === undefined) {
    return GLOBAL_CONFIG[key] as any
  }

  return value as any
}
