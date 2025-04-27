import { SequentialIdGenerator } from './id'

it('sequentialIdGenerator', () => {
  const idGenerator = new SequentialIdGenerator()

  expect(idGenerator.generate()).toBe(0)
  expect(idGenerator.generate()).toBe(1)
  expect(idGenerator.generate()).toBe(2)

  ;(idGenerator as any).nextId = Number.MAX_SAFE_INTEGER

  expect(idGenerator.generate()).toBe(Number.MAX_SAFE_INTEGER)
  expect(idGenerator.generate()).toBe(0)
  expect(idGenerator.generate()).toBe(1)
})
