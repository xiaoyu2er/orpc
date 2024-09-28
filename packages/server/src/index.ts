/** dinwwwh */

import { Builder } from './builder'

export const initORPC = new Builder<undefined | Record<string, unknown>, undefined>()

export * as ORPC from './index.internal'
