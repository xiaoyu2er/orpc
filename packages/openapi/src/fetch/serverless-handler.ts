import type { FetchHandler } from '@orpc/server/fetch'
import { LinearRouter } from 'hono/router/linear-router'
import { createOpenAPIHandler } from './base-handler'

export function createOpenAPIServerlessHandler(): FetchHandler {
  return createOpenAPIHandler(() => new LinearRouter())
}
