import { z } from 'zod'
import { initORPC } from '.'

const orpc = initORPC

const router = orpc.router({
  ping: orpc.handler((input) => {
    return { pong: input }
  }),

  user: {
    find: orpc
      .input(z.object({ id: z.string() }))
      .output(z.object({ id: z.string(), name: z.string() }))
      .handler((input) => {
        return {
          id: input.id,
          name: 'dinwwwh',
        }
      }),
  },
})
