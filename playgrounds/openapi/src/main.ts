import { createServer } from 'node:http'
import { OpenAPIGenerator } from '@orpc/openapi'
import { OpenAPIServerHandler } from '@orpc/openapi/node'
import { RPCHandler } from '@orpc/server/node'
import { ZodCoercer, ZodToJsonSchemaConverter } from '@orpc/zod'
import { router } from './router'
import './polyfill'

const openAPIHandler = new OpenAPIServerHandler(router, {
  schemaCoercers: [
    new ZodCoercer(),
  ],
  onError: ({ error }) => {
    console.error(error)
  },
})

const rpcHandler = new RPCHandler(router, {
  onError: ({ error }) => {
    console.error(error)
  },
})

const openAPIGenerator = new OpenAPIGenerator({
  schemaConverters: [
    new ZodToJsonSchemaConverter(),
  ],
})

const server = createServer(async (req, res) => {
  const context = req.headers.authorization
    ? { user: { id: 'test', name: 'John Doe', email: 'john@doe.com' } }
    : {}

  if (req.url?.startsWith('/api')) {
    const { matched } = await openAPIHandler.handle(req, res, {
      prefix: '/api',
      context,
    })

    if (matched) {
      return
    }
  }

  if (req.url?.startsWith('/rpc')) {
    const { matched } = await rpcHandler.handle(req, res, {
      prefix: '/rpc',
      context,
    })

    if (matched) {
      return
    }
  }

  if (req.url === '/spec.json') {
    const spec = await openAPIGenerator.generate(router, {
      info: {
        title: 'ORPC Playground',
        version: '1.0.0',
        description: `
The example OpenAPI Playground for ORPC.

## Resources

* [Github](https://github.com/unnoq/orpc)
* [Documentation](https://orpc.unnoq.com)
          `,
      },
      servers: [
        { url: '/api' /** Should use absolute URLs in production */ },
      ],
      security: [{ bearerAuth: [] }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
          },
        },
      },
    })

    res.writeHead(200, {
      'Content-Type': 'application/json',
    })
    res.end(JSON.stringify(spec))
    return
  }

  const html = `
<!doctype html>
  <html>
  <head>
    <title>ORPC Playground </title>
    <meta charset = "utf-8" />
    <meta name="viewport" content = "width=device-width, initial-scale=1" />
    <link rel="icon" type = "image/svg+xml" href = "https://orpc.unnoq.com/icon.svg" />
  </head>
  <body>
    <script
      id="api-reference"
      data-url="/spec.json"
      data-configuration="${JSON.stringify({
        authentication: {
          preferredSecurityScheme: 'bearerAuth',
          http: {
            bearer: {
              token: 'default-token',
            },
          },
        },
      }).replaceAll('"', '&quot;')}"></script>

    <script src= "https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>
  `

  res.writeHead(200, {
    'Content-Type': 'text/html',
  })
  res.end(html)
})

server.listen(3000, () => {
  // eslint-disable-next-line no-console
  console.log('Playground is available at http://localhost:3000')
})
