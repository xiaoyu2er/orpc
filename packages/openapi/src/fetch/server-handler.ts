import type { FetchHandler } from '@orpc/server/fetch'
import { RegExpRouter } from 'hono/router/reg-exp-router'
import { createOpenAPIHandler } from './base-handler'

export const OpenAPIServerHandler: FetchHandler = createOpenAPIHandler(() => new RegExpRouter())
