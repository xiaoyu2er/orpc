import { client } from '~/lib/orpc'

const planets = await client.planet.list({})

const planet = await client.planet.find({ id: 1 })

const token = await client.auth.signin({
  email: 'john@doe.com',
  password: '123456',
})
