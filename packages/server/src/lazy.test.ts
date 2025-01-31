import { ping } from '../tests/shared'
import { isLazy, lazy, unlazy } from './lazy'

it('lazy & isLazy & unlazy ', () => {
  const lazied = lazy(() => Promise.resolve({ default: ping }))
  expect(lazied).toSatisfy(isLazy)
  expect(unlazy(lazied)).resolves.toEqual({ default: ping })

  expect({}).not.toSatisfy(isLazy)
  expect(true).not.toSatisfy(isLazy)
})
