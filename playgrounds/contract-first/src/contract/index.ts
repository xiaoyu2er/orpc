import { oc } from '@orpc/contract'
import { me, refresh, revoke, signin, signup } from './auth'
import {
  createPlanet,
  deletePlanet,
  findPlanet,
  listPlanets,
  updatePlanet,
  updatePlanetImage,
} from './planet'

export const contract = oc.router({
  auth: oc.tag('Authentication').prefix('/auth').router({
    signup,
    signin,
    refresh,
    revoke,
    me,
  }),

  planet: oc.tag('Planets').prefix('/planets').router({
    list: listPlanets,
    create: createPlanet,
    find: findPlanet,
    update: updatePlanet,
    updateImage: updatePlanetImage,
    delete: deletePlanet,
  }),
})
