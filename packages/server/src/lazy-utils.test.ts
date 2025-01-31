import { ping } from '../tests/shared'
import { isLazy, lazy, unlazy } from './lazy'
import { createLazyProcedureFormAnyLazy, flatLazy } from './lazy-utils'

it('flatLazy', () => {
  const lazied = lazy(() => Promise.resolve({
    default: lazy(() => Promise.resolve({
      default: lazy(() => Promise.resolve({ default: ping })),
    })),
  }))

  const flatten = flatLazy(lazied)
  expect(flatten).toSatisfy(isLazy)
  expect(unlazy(flatten)).resolves.toEqual({ default: ping })
})

describe('createLazyProcedureFormAnyLazy', () => {
  it('return a Lazy<ANY_PROCEDURE>', async () => {
    const lazyPing = lazy(() => Promise.resolve({ default: ping }))

    const lazyProcedure = createLazyProcedureFormAnyLazy(lazyPing)

    expect(lazyProcedure).toSatisfy(isLazy)
    expect(unlazy(lazyProcedure)).resolves.toEqual({ default: ping })
  })

  it('throw un unlazy non-procedure', () => {
    const lazyPing = lazy(() => Promise.resolve({ default: {} as unknown }))
    const lazyProcedure = createLazyProcedureFormAnyLazy(lazyPing)

    expect(unlazy(lazyProcedure)).rejects.toThrow('Expected a lazy<procedure> but got lazy<unknown>')
  })

  it('flat lazy', () => {
    const lazyPing = lazy(() => Promise.resolve({ default: lazy(() => Promise.resolve({ default: ping })) }))
    const lazyProcedure = createLazyProcedureFormAnyLazy(lazyPing)

    expect(unlazy(lazyProcedure)).resolves.toEqual({ default: ping })
  })
})
