import {
  createStartAPIHandler,
  defaultAPIFileRouteHandler,
} from '@tanstack/react-start/api'

export default createStartAPIHandler((ctx) => {
  if (import.meta.env.DEV) {
    console.log(ctx.request.url)
  }

  return defaultAPIFileRouteHandler(ctx)
})
