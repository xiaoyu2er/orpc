import { oc } from '@orpc/contract'
import { oz } from '@orpc/zod'
import { z } from 'zod'
import { planets } from '../data/planet'
import {
  NewPlanetSchema,
  PlanetSchema,
  UpdatePlanetSchema,
} from '../schemas/planet'

export const listPlanets = oc
  .route({
    method: 'GET',
    path: '/',
    summary: 'List all planets',
  })
  .input(
    z.object({
      limit: z.number().int().min(1).max(100).optional(),
      cursor: z.number().int().min(0).default(0),
    }),
  )
  .output(oz.openapi(z.array(PlanetSchema), { examples: [planets] }))

export const createPlanet = oc
  .route({
    method: 'POST',
    path: '/',
    summary: 'Create a planet',
  })
  .input(NewPlanetSchema)
  .output(PlanetSchema)

export const findPlanet = oc
  .route({
    method: 'GET',
    path: '/{id}',
    summary: 'Find a planet',
  })
  .input(
    z.object({
      id: z.number().int().min(1),
    }),
  )
  .output(PlanetSchema)

export const updatePlanet = oc
  .route({
    method: 'PUT',
    path: '/{id}',
    summary: 'Update a planet',
  })
  .input(UpdatePlanetSchema)
  .output(PlanetSchema)

export const updatePlanetImage = oc
  .route({
    method: 'PATCH',
    path: '/{id}/image',
    summary: 'Update a planet image',
  })
  .input(
    z.object({
      id: z.number().int().min(1),
      image: oz.file().type('image/*').optional(),
    }),
  )
  .output(PlanetSchema)

export const deletePlanet = oc
  .route({
    method: 'DELETE',
    path: '/{id}',
    summary: 'Delete a planet',
    deprecated: true,
  })
  .input(
    z.object({
      id: z.number().int().min(1),
    }),
  )
