import { getQueryKey } from '../src/query'
import { orpcReact } from './orpc'

describe('getQueryKey', () => {
  it('on router', () => {
    expect(getQueryKey(orpcReact.user)).toEqual([['user'], {}])

    expect(getQueryKey(orpcReact.user, undefined, 'any')).toEqual([
      ['user'],
      {},
    ])

    expect(getQueryKey(orpcReact.user, undefined, 'infinite')).toEqual([
      ['user'],
      { type: 'infinite' },
    ])
  })

  it('on procedure', () => {
    ;() => {
      // @ts-expect-error invalid input
      getQueryKey(orpcReact.user.create, { invalid: true })
    }

    expect(getQueryKey(orpcReact.user.create)).toEqual([['user', 'create'], {}])

    expect(getQueryKey(orpcReact.user.create, { name: 'name' }, 'any')).toEqual(
      [['user', 'create'], { input: { name: 'name' } }],
    )

    expect(
      getQueryKey(orpcReact.user.create, { name: 'name' }, 'infinite'),
    ).toEqual([
      ['user', 'create'],
      { input: { name: 'name' }, type: 'infinite' },
    ])
  })
})
