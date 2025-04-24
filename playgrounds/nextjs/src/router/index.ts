import { pub } from '@/orpc'
import { me, signin, signup } from './auth'
import { sse } from './sse'

export const router = {
  auth: {
    signup,
    signin,
    me,
  },

  planet: pub.lazy(() => import('./planet')),

  sse,
}
