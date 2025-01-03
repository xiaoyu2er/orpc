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
   * @default 'OK'
   */
  defaultSuccessDescription?: string

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
  defaultSuccessDescription: 'OK',
  defaultInputStructure: 'compact',
  defaultOutputStructure: 'compact',
}

const GLOBAL_CONFIG_REF: { value: ORPCConfig } = { value: DEFAULT_CONFIG }

/**
 * Set the global configuration, this configuration can effect entire project
 */
export function configGlobal(config: ORPCConfig): void {
  if (
    config.defaultSuccessStatus !== undefined
    && (config.defaultSuccessStatus < 200 || config.defaultSuccessStatus > 299)
  ) {
    throw new Error('[configGlobal] The defaultSuccessStatus must be between 200 and 299')
  }

  GLOBAL_CONFIG_REF.value = config
}

/**
 * Fallback the value to the global config if it is undefined
 */
export function fallbackToGlobalConfig<T extends keyof ORPCConfig>(key: T, value: ORPCConfig[T]): Exclude<ORPCConfig[T], undefined> {
  if (value === undefined) {
    const fallback = GLOBAL_CONFIG_REF.value[key]

    if (fallback === undefined) {
      return DEFAULT_CONFIG[key] as any
    }

    return fallback as any
  }

  return value as any
}
