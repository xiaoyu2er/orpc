/**
 * This file is where you can play with type of oRPC Client.
 */

import type { contract } from './contract'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'

const rPCLink = new RPCLink({
  url: 'http://localhost:3000/rpc',
})

export const orpc = createORPCClient<typeof contract>(rPCLink)

const planets = await orpc.planet.list({})

const planet = await orpc.planet.find({ id: 1 })

const token = await orpc.auth.signin({
  email: 'john@doe.com',
  password: '123456',
})

// ...
