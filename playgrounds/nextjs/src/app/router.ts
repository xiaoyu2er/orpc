import { me, refresh, revoke, signin, signup } from '@/actions/auth'
import {
  createPlanet,
  deletePlanet,
  findPlanet,
  listPlanets,
  updatePlanet,
  updatePlanetImage,
} from '@/actions/planet'
import { pub } from '@/orpc'

export const router = pub.router({
  auth: pub.tag('Authentication').router({
    signup,
    signin,
    refresh,
    revoke,
    me,
  }),

  planet: pub.tag('Planets').router({
    list: listPlanets,
    create: createPlanet,
    find: findPlanet,
    update: updatePlanet,
    updateImage: updatePlanetImage,
    delete: deletePlanet,
  }),
})
