import { CompositeClientPlugin } from './base'

it('compositeClientPlugin', () => {
  const plugin1 = { init: vi.fn() }
  const plugin2 = {}
  const plugin3 = { init: vi.fn() }

  const composite = new CompositeClientPlugin([plugin1, plugin2, plugin3])

  composite.init('__OPTIONS__' as any)

  expect(plugin1.init).toHaveBeenCalledTimes(1)
  expect(plugin1.init).toHaveBeenCalledWith('__OPTIONS__')
  expect(plugin3.init).toHaveBeenCalledTimes(1)
  expect(plugin3.init).toHaveBeenCalledWith('__OPTIONS__')
})
