import { oc } from '@orpc/contract'
import { z } from 'zod'
import { os, RouterImplementer } from '.'

const cp1 = oc.input(z.string()).output(z.string())
const cp2 = oc.output(z.string())
const cp3 = oc.route({ method: 'GET', path: '/test' })
const cr = oc.router({
  p1: cp1,
  nested: oc.router({
    p2: cp2,
  }),
  nested2: {
    p3: cp3,
  },
})

const osw = os.context<{ auth: boolean }>().contract(cr)

const p1 = osw.p1.func(() => {
  return 'unnoq'
})

const p2 = osw.nested.p2.func(() => {
  return 'unnoq'
})

const p3 = osw.nested2.p3.func(() => {
  return 'unnoq'
})

it('required all procedure match', () => {
  const implementer = new RouterImplementer<{ auth: boolean }, typeof cr>({
    contract: cr,
  })

  implementer.router({
    p1,
    nested: {
      p2: os.contract(cp2).func(() => ''),
    },
    nested2: {
      p3,
    },
  })

  expect(() => {
    implementer.router({
      // @ts-expect-error p1 is mismatch
      p1: os.func(() => {}),
      nested: {
        p2,
      },
      nested2: {
        p3,
      },
    })
  }).toThrowError('Mismatch implementation for procedure at [p1]')

  expect(() => {
    implementer.router({
      // @ts-expect-error p1 is mismatch
      p1: osw,
      nested: {
        p2,
      },
      nested2: {
        p3,
      },
    })
  }).toThrowError('Mismatch implementation for procedure at [p1]')

  expect(() => {
    implementer.router({
      // Not allow manual specification
      p1: os
        .input(z.string())
        .output(z.string())
        .func(() => 'unnoq'),
      nested: {
        p2,
      },
      nested2: {
        p3,
      },
    })
  }).toThrowError('Mismatch implementation for procedure at [p1]')

  expect(() => {
    // @ts-expect-error required all procedure match
    implementer.router({})
  }).toThrowError('Missing implementation for procedure at [p1]')

  expect(() => {
    implementer.router({
      p1,
      nested: {
        p2,
      },
      // @ts-expect-error missing p3
      nested2: {},
    })
  }).toThrowError('Missing implementation for procedure at [nested2.p3]')

  expect(() => {
    implementer.router({
      p1,
      nested: {
        p2,
      },
      nested2: {
        p3: p3.prefix('/test'),
      },
    })
  }).toThrowError('Mismatch implementation for procedure at [nested2.p3]')
})
