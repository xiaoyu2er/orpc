/**
 * This file is where you can play with type of oRPC Client.
 */

import type { router } from './router'
import { createClient } from '@orpc/client'
import { ORPCLink } from '@orpc/client/fetch'

const orpcLink = new ORPCLink({
  url: 'http://localhost:3000/api',
})

const orpc = createClient<typeof router>(orpcLink)

const planets = await orpc.planet.list({})

const planet = await orpc.planet.find({ id: 1 })

const token = await orpc.auth.signin({
  email: 'john@doe.com',
  password: '123456',
})

// ...
