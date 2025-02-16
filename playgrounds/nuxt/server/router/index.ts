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
import { stream } from './stream'

export const router = {
  stream,

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
