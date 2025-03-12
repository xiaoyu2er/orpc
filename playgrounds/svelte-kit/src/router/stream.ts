import { eventIterator } from '@orpc/contract'
import { z } from 'zod'
import { pub } from '../orpc'

export const stream = pub
  .route({ path: '/stream', method: 'GET' })
  .output(eventIterator(z.object({ message: z.string() })))
  .handler(async function*() {
    let counter = 0

    while (counter < 5) {
      yield { message: `Hello, world! ${counter++}` }
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  })
