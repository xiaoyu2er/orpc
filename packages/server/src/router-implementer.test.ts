import { initORPCContract } from '@orpc/contract'
import { z } from 'zod'
import { RouterImplementer, initORPC, isProcedure } from '.'

const cp1 = initORPCContract.input(z.string()).output(z.string())
const cp2 = initORPCContract.output(z.string())
const cp3 = initORPCContract.route({ method: 'GET', path: '/test' })
const cr = initORPCContract.router({
  p1: cp1,
  nested: initORPCContract.router({
    p2: cp2,
  }),
  nested2: {
    p3: cp3,
  },
})

const orpc = initORPC.context<{ auth: boolean }>().contract(cr)

const p1 = orpc.p1.handler(() => {
  return 'dinwwwh'
})

const p2 = orpc.nested.p2.handler(() => {
  return 'dinwwwh'
})

const p3 = orpc.nested2.p3.handler(() => {
  return 'dinwwwh'
})

it('required all procedure match', () => {
  const implementer = new RouterImplementer<{ auth: boolean }, typeof cr>({
    contract: cr,
  })

  implementer.router({
    p1: p1,
    nested: {
      p2: initORPC.contract(cp2).handler(() => ''),
    },
    nested2: {
      p3: p3,
    },
  })

  expect(() => {
    implementer.router({
      // @ts-expect-error p1 is mismatch
      p1: initORPC.handler(() => {}),
      nested: {
        p2: p2,
      },
      nested2: {
        p3: p3,
      },
    })
  }).toThrowError('Mismatch implementation for procedure at [p1]')

  expect(() => {
    implementer.router({
      // @ts-expect-error p1 is mismatch
      p1: initORPC,
      nested: {
        p2: p2,
      },
      nested2: {
        p3: p3,
      },
    })
  }).toThrowError('Mismatch implementation for procedure at [p1]')

  expect(() => {
    implementer.router({
      // Not allow manual specification
      p1: initORPC
        .input(z.string())
        .output(z.string())
        .handler(() => 'dinwwwh'),
      nested: {
        p2: p2,
      },
      nested2: {
        p3: p3,
      },
    })
  }).toThrowError('Mismatch implementation for procedure at [p1]')

  expect(() => {
    // @ts-expect-error required all procedure match
    implementer.router({})
  }).toThrowError('Missing implementation for procedure at [p1]')

  expect(() => {
    implementer.router({
      p1: p1,
      nested: {
        p2: p2,
      },
      // @ts-expect-error missing p3
      nested2: {},
    })
  }).toThrowError('Missing implementation for procedure at [nested2.p3]')

  expect(() => {
    implementer.router({
      p1: p1,
      nested: {
        p2: p2,
      },
      nested2: {
        p3: p3.prefix('/test'),
      },
    })
  }).toThrowError('Mismatch implementation for procedure at [nested2.p3]')
})
