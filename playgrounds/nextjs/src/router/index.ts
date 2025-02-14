import { os } from '@orpc/server'
import { pub } from '../orpc'
import { me, refresh, revoke, signin, signup } from './auth'
import {
  createPlanet,
  deletePlanet,
  findPlanet,
  listPlanets,
  updatePlanet,
  updatePlanetImage,
} from './planet'

export const router = {
  ping: os
    .route({ method: 'GET' })
    .handler(async function* () {
      yield 'pong'
      await new Promise(resolve => setTimeout(resolve, 1000))
      yield 'pong'
      await new Promise(resolve => setTimeout(resolve, 1000))

      yield 'pong'
      await new Promise(resolve => setTimeout(resolve, 1000))

      yield 'pong'
      await new Promise(resolve => setTimeout(resolve, 1000))

      yield 'pong'
      await new Promise(resolve => setTimeout(resolve, 1000))

      yield 'pong'
      await new Promise(resolve => setTimeout(resolve, 1000))

      return 'done'
    }),

  auth: pub.tag('Authentication').prefix('/auth').router({
    signup,
    signin,
    refresh,
    revoke,
    me,
  }),

  planet: pub.tag('Planets').prefix('/planets').router({
    list: listPlanets,
    create: createPlanet,
    find: findPlanet,
    update: updatePlanet,
    updateImage: updatePlanetImage,
    delete: deletePlanet,
  }),
}
