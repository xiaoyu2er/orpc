import { getEventMeta, isEventMetaContainer, withEventMeta } from './meta'

it('isEventMetaContainer', () => {
  expect(new Error('hi')).toSatisfy(isEventMetaContainer)
  expect({}).toSatisfy(isEventMetaContainer)
  expect(() => { }).toSatisfy(isEventMetaContainer)
  expect(new Proxy({}, {})).toSatisfy(isEventMetaContainer)

  expect(1).not.toSatisfy(isEventMetaContainer)
  expect(null).not.toSatisfy(isEventMetaContainer)
  expect(undefined).not.toSatisfy(isEventMetaContainer)
  expect(true).not.toSatisfy(isEventMetaContainer)
})

it('get/withEventMeta', () => {
  const data = { value: 123, meta: undefined }
  const applied = withEventMeta(data, { id: '123', retry: 10000 })
  expect(applied).toEqual(data)
  expect(applied).not.toBe(data)
  expect(getEventMeta(applied)).toEqual({ id: '123', retry: 10000 })
  expect(getEventMeta(data)).toEqual(undefined)
  expect(getEventMeta(1)).toEqual(undefined)

  expect(() => withEventMeta(data, { id: '123\n' })).toThrow('Event-source id must not contain a newline character')
  expect(() => withEventMeta(data, { retry: Number.NaN })).toThrow('Event-source retry must be a integer and >= 0')
  expect(() => withEventMeta(data, { retry: 1.1 })).toThrow('Event-source retry must be a integer and >= 0')
  expect(() => withEventMeta(data, { retry: -1 })).toThrow('Event-source retry must be a integer and >= 0')
})
