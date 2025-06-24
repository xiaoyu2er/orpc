import { SequentialIdGenerator } from './id'

it('sequentialIdGenerator', () => {
  const idGenerator = new SequentialIdGenerator()

  expect(idGenerator.generate()).toBe('0')
  expect(idGenerator.generate()).toBe('1')
  expect(idGenerator.generate()).toBe('2')
})
