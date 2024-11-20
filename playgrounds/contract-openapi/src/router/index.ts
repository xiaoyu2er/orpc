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

export const router = pub.router({
  auth: pub.auth.router({
    signup,
    signin,
    refresh,
    revoke,
    me,
  }),

  planet: pub.planet.router({
    list: listPlanets,
    create: createPlanet,
    find: findPlanet,
    update: updatePlanet,
    updateImage: updatePlanetImage,
    delete: deletePlanet,
  }),
})
