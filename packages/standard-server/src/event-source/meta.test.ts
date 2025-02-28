import { getEventMeta, withEventMeta } from './meta'

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
