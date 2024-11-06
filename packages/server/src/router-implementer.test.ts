import { ioc } from '@orpc/contract'
import { z } from 'zod'
import { RouterImplementer, ios } from '.'

const cp1 = ioc.input(z.string()).output(z.string())
const cp2 = ioc.output(z.string())
const cp3 = ioc.route({ method: 'GET', path: '/test' })
const cr = ioc.router({
  p1: cp1,
  nested: ioc.router({
    p2: cp2,
  }),
  nested2: {
    p3: cp3,
  },
})

const os = ios.context<{ auth: boolean }>().contract(cr)

const p1 = os.p1.handler(() => {
  return 'dinwwwh'
})

const p2 = os.nested.p2.handler(() => {
  return 'dinwwwh'
})

const p3 = os.nested2.p3.handler(() => {
  return 'dinwwwh'
})

it('required all procedure match', () => {
  const implementer = new RouterImplementer<{ auth: boolean }, typeof cr>({
    contract: cr,
  })

  implementer.router({
    p1: p1,
    nested: {
      p2: ios.contract(cp2).handler(() => ''),
    },
    nested2: {
      p3: p3,
    },
  })

  expect(() => {
    implementer.router({
      // @ts-expect-error p1 is mismatch
      p1: ios.handler(() => {}),
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
      p1: ios,
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
      p1: ios
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
