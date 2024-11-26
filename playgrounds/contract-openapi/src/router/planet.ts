import { ORPCError } from '@orpc/server'
import { planets } from '../data/planet'
import { authed, pub } from '../orpc'

export const listPlanets = pub.planet.list.func(
  async (input, context, meta) => {
    return planets
  },
)

export const createPlanet = authed.planet.create.func(
  async (input, context, meta) => {
    const id = planets.length + 1

    const planet = {
      id,
      name: input.name,
      description: input.description,
      imageUrl: input.image ? 'https://picsum.photos/200/300' : undefined,
      creator: context.user,
    }

    planets.push(planet)

    return planet
  },
)

export const findPlanet = pub.planet.find.func(
  async (input, context, meta) => {
    const planet = planets.find(planet => planet.id === input.id)

    if (!planet) {
      throw new ORPCError({
        code: 'NOT_FOUND',
        message: 'Planet not found',
      })
    }

    return planet
  },
)

export const updatePlanet = authed.planet.update.func(
  async (input, context, meta) => {
    const planet = planets.find(planet => planet.id === input.id)

    if (!planet) {
      throw new ORPCError({
        code: 'NOT_FOUND',
        message: 'Planet not found',
      })
    }

    planet.name = input.name ?? planet.name
    planet.description = input.description ?? planet.description
    planet.imageUrl = input.image ? 'https://picsum.photos/200/300' : undefined

    return planet
  },
)

export const updatePlanetImage = authed.planet.updateImage.func(
  async (input, context, meta) => {
    const planet = planets.find(planet => planet.id === input.id)

    if (!planet) {
      throw new ORPCError({
        code: 'NOT_FOUND',
        message: 'Planet not found',
      })
    }

    planet.imageUrl = input.image ? 'https://picsum.photos/200/300' : undefined

    return planet
  },
)

export const deletePlanet = authed.planet.delete.func(
  async (input, context, meta) => {
    const planet = planets.find(planet => planet.id === input.id)

    if (!planet) {
      throw new ORPCError({
        code: 'NOT_FOUND',
        message: 'Planet not found',
      })
    }

    planets.splice(planets.indexOf(planet), 1)
  },
)
