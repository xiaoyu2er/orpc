import { RouterBuilder } from './router-builder'

const mid1 = vi.fn()
const mid2 = vi.fn()

const builder = new RouterBuilder<{ auth: boolean }, { db: string }>({
  middlewares: [mid1, mid2],
  prefix: '/prefix',
  tags: ['tag1', 'tag2'],
})

describe('self chainable', () => {
  it('prefix', () => {
    const prefixed = builder.prefix('/test')
    expect(prefixed).not.toBe(builder)
    expect(prefixed).toBeInstanceOf(RouterBuilder)
    expect(prefixed['~orpc'].prefix).toBe('/prefix/test')
  })

  it('tag', () => {
    const tagged = builder.tag('test1', 'test2')
    expect(tagged).not.toBe(builder)
    expect(tagged).toBeInstanceOf(RouterBuilder)
    expect(tagged['~orpc'].tags).toEqual(['tag1', 'tag2', 'test1', 'test2'])
  })

  it('use middleware', () => {
    const mid3 = vi.fn()
    const mid4 = vi.fn()

    const applied = builder.use(mid3).use(mid4)
    expect(applied).not.toBe(builder)
    expect(applied).toBeInstanceOf(RouterBuilder)
    expect(applied['~orpc'].middlewares).toEqual([mid1, mid2, mid3, mid4])
  })
})
