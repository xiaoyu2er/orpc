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
  stream: pub
    .route({
      method: 'GET',
      path: '/ping',
    })
    .handler(async function* () {
      let count = 1
      while (count < 5) {
        count += 1
        yield { time: new Date() }
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

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
