import { getPath } from '../src/path'
import { orpcReact } from './orpc'

it('getPath', () => {
  expect(getPath({})).toEqual([])
  expect(getPath(orpcReact.user)).toEqual(['user'])
  expect(getPath(orpcReact.user.find)).toEqual(['user', 'find'])
})
