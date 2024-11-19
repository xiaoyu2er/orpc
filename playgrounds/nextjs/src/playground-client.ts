/**
 * This file is where you can play with type of oRPC Client.
 */

import { orpcClient as orpc } from '@/lib/orpc'

const planets = await orpc.planet.list({})

const planet = await orpc.planet.find({ id: 1 })

const token = await orpc.auth.signin({
  email: 'john@doe.com',
  password: '123456',
})

// ...
