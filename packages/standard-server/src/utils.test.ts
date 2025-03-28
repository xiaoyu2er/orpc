import { mergeStandardHeaders } from './utils'

it('mergeStandardHeaders', () => {
  expect(mergeStandardHeaders({ a: '1' }, { a: '2' })).toEqual({ a: ['1', '2'] })
  expect(mergeStandardHeaders({ a: ['1'] }, { a: '2' })).toEqual({ a: ['1', '2'] })
  expect(mergeStandardHeaders({ a: ['1', '2'] }, { a: '3' })).toEqual({ a: ['1', '2', '3'] })
  expect(mergeStandardHeaders({ a: ['1', '2'] }, { a: ['3'] })).toEqual({ a: ['1', '2', '3'] })
  expect(mergeStandardHeaders({ a: ['1', '2'] }, { a: ['3', '4'] })).toEqual({ a: ['1', '2', '3', '4'] })

  expect(mergeStandardHeaders({ a: '1' }, { b: '2' })).toEqual({ a: '1', b: '2' })
  expect(mergeStandardHeaders({ a: '1', b: undefined }, { b: '2' })).toEqual({ a: '1', b: '2' })
  expect(mergeStandardHeaders({ a: '1' }, { a: undefined, b: '2' })).toEqual({ a: '1', b: '2' })
})
