import { addMiddleware, dedupeMiddlewares, mergeMiddlewares } from './middleware-utils'

const mid1 = vi.fn()
const mid2 = vi.fn()
const mid3 = vi.fn()

it('dedupeMiddlewares', () => {
  expect(dedupeMiddlewares([mid1, mid2], [])).toEqual([])
  expect(dedupeMiddlewares([], [mid1, mid2])).toEqual([mid1, mid2])
  expect(dedupeMiddlewares([mid1], [mid2])).toEqual([mid2])
  expect(dedupeMiddlewares([mid1], [mid1, mid2])).toEqual([mid2])
  expect(dedupeMiddlewares([mid1, mid3], [mid1, mid2])).toEqual([mid2])
  expect(dedupeMiddlewares([mid1, mid3], [mid1, mid2, mid3])).toEqual([mid2, mid3])
})

it('mergeMiddlewares', () => {
  expect(mergeMiddlewares([mid1, mid2], [])).toEqual([mid1, mid2])
  expect(mergeMiddlewares([], [mid1, mid2])).toEqual([mid1, mid2])
  expect(mergeMiddlewares([mid1], [mid2])).toEqual([mid1, mid2])
  expect(mergeMiddlewares([mid1], [mid1, mid2])).toEqual([mid1, mid2])
  expect(mergeMiddlewares([mid1, mid3], [mid1, mid2])).toEqual([mid1, mid3, mid2])
  expect(mergeMiddlewares([mid1, mid3], [mid1, mid2, mid3])).toEqual([mid1, mid3, mid2, mid3])
})

it('addMiddleware', () => {
  expect(addMiddleware([], mid1)).toEqual([mid1])
  expect(addMiddleware([mid1], mid2)).toEqual([mid1, mid2])
  expect(addMiddleware([mid1], mid2)).toEqual([mid1, mid2])
})
