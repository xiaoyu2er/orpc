import { ping, pong, router } from '../tests/shared'
import { isLazy, lazy, unlazy } from './lazy'
import { createAccessibleLazyRouter } from './router-accessible-lazy'

describe('createAccessibleLazyRouter', () => {
  const accessible = createAccessibleLazyRouter(lazy(() => Promise.resolve({ default: router })))

  it('works', () => {
    expect(accessible).toSatisfy(isLazy)
    expect(unlazy(accessible)).resolves.toEqual({ default: router })

    expect(accessible.ping).toSatisfy(isLazy)
    expect(unlazy(accessible.ping)).resolves.toEqual({ default: ping })

    expect(accessible.nested.ping).toSatisfy(isLazy)
    expect(unlazy(accessible.nested.ping)).resolves.toEqual({ default: ping })

    expect(accessible.pong).toSatisfy(isLazy)
    expect(unlazy(accessible.pong)).resolves.toEqual({ default: pong })

    expect(accessible.nested.pong).toSatisfy(isLazy)
    expect(unlazy(accessible.nested.pong)).resolves.toEqual({ default: pong })
  })

  it('is Lazy<undefined> when access undefined router', () => {
    expect((accessible as any).a.b.c.d.e).toSatisfy(isLazy)
    expect(unlazy((accessible as any).a.b.c.d.e)).resolves.toEqual({ default: undefined })
  })

  it('not recursive with symbol', () => {
    expect((accessible as any)[Symbol.for('test')]).toEqual(undefined)
  })
})
