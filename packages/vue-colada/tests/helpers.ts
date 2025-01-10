import { PiniaColada } from '@pinia/colada'
import { QueryClient } from '@tanstack/vue-query'
import { mount as baseMount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { orpc as client } from '../../client/tests/helpers'
import { createORPCVueColadaUtils } from '../src'

export const orpc = createORPCVueColadaUtils(client)

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

export const mount: typeof baseMount = (component, options) => {
  return baseMount(component, {
    global: {
      plugins: [
        createPinia(),
        PiniaColada,
      ],
    },
    ...options,
  })
}
