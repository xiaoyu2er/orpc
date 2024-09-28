import { initORPCContract } from '@orpc/contract'
import { z } from 'zod'
import { initORPC } from '.'

const orpc = initORPC

orpc.router({
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

const pingContract = initORPCContract
  .input(z.object({ message: z.string() }))
  .output(z.object({ pong: z.string() }))

initORPC
  .context<{ a: string; b: string }>()
  .contract(
    initORPCContract.router({
      ping: pingContract,
    })
  )
  .router({
    ping: initORPC
      .context<{ a: string }>()
      .contract(pingContract)
      .handler((input) => {
        return { pong: input.message }
      })
      .prefix('/d'),
  })
