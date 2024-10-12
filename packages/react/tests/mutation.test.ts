import { getMutationKey } from '../src/mutation'
import { orpcReact } from './orpc'

describe('getMutationKey', () => {
  it('on router', () => {
    expect(getMutationKey(orpcReact.user)).toEqual([['user']])
  })

  it('on procedure', () => {
    expect(getMutationKey(orpcReact.user.create)).toEqual([['user', 'create']])
  })
})
