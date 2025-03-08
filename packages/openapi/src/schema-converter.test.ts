import { z } from 'zod'
import { CompositeSchemaConverter } from './schema-converter'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('compositeSchemaConverter', () => {
  const converter1 = {
    condition: vi.fn(),
    convert: vi.fn(),
  }

  const converter2 = {
    condition: vi.fn(),
    convert: vi.fn(),
  }

  const converter = new CompositeSchemaConverter([
    converter1,
    converter2,
  ])

  const schema = z.object({})

  it('fallback to any if no condition is matched', () => {
    expect(converter.convert(schema, { strategy: 'input' })).toEqual([false, {}])

    expect(converter1.condition).toBeCalledTimes(1)
    expect(converter1.condition).toBeCalledWith(schema, { strategy: 'input' })
    expect(converter1.convert).not.toHaveBeenCalled()
    expect(converter2.condition).toBeCalledTimes(1)
    expect(converter2.condition).toBeCalledWith(schema, { strategy: 'input' })
    expect(converter2.convert).not.toHaveBeenCalled()
  })

  it('return result of first converter if condition is matched', () => {
    converter1.condition.mockReturnValue(true)
    converter1.convert.mockReturnValue('__MATCHED__')

    expect(converter.convert(schema, { strategy: 'input' })).toEqual('__MATCHED__')

    expect(converter1.condition).toBeCalledTimes(1)
    expect(converter1.convert).toHaveBeenCalled()
    expect(converter1.convert).toBeCalledWith(schema, { strategy: 'input' })

    expect(converter2.condition).not.toHaveBeenCalled()
    expect(converter2.convert).not.toHaveBeenCalled()
  })
})
