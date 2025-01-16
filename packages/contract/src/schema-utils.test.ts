import { type } from './schema-utils'

describe('type', async () => {
  it('without check', async () => {
    const schema = type()
    const val = {}
    expect((await schema['~standard'].validate(val) as any).value).toBe(val)
  })

  it('with check', async () => {
    const val = {}
    const check = vi.fn().mockReturnValueOnce({ value: val })
    const schema = type(check)
    expect((await schema['~standard'].validate(val) as any).value).toBe(val)
    expect(check).toHaveBeenCalledWith(val)
  })
})
