import { ping } from '../tests/shared'
import { getLazyMeta, isLazy, lazy, unlazy } from './lazy'

it('lazy & isLazy & unlazy & getLazyMeta', () => {
  const lazied = lazy(() => Promise.resolve({ default: ping }), { prefix: '/test' })
  expect(lazied).toSatisfy(isLazy)
  expect(unlazy(lazied)).resolves.toEqual({ default: ping })
  expect(getLazyMeta(lazied)).toEqual({ prefix: '/test' })

  expect({}).not.toSatisfy(isLazy)
  expect(true).not.toSatisfy(isLazy)
})
