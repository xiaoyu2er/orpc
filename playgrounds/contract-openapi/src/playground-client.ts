/**
 * This file is where you can play with type of oRPC Client.
 */

import type { contract } from './contract'
import { createORPCClient } from '@orpc/client'

const orpc = createORPCClient<typeof contract>({
  baseURL: 'http://localhost:3000/api',
})

const planets = await orpc.planet.list({})

const planet = await orpc.planet.find({ id: 1 })

const token = await orpc.auth.signin({
  email: 'john@doe.com',
  password: '123456',
})

// ...
