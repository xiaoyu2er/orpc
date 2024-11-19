/**
 * This file is where you can play with type of oRPC Client.
 */

import { createORPCClient } from '@orpc/client'
import type { contract } from './contract'

const orpc = createORPCClient<typeof contract>({
  baseURL: 'http://localhost:2026/api',
})

const planets = await orpc.planet.list({})

const planet = await orpc.planet.find({ id: 1 })

const token = await orpc.auth.signin({
  email: 'john@doe.com',
  password: '123456',
})

// ...
