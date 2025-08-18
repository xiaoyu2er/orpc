import useSWR from 'swr'
import useSWRInfinite from 'swr/infinite'
import useSWRMutation from 'swr/mutation'
import useSWRSubscription from 'swr/subscription'
import { orpc as client } from '../../client/tests/shared'
import { orpc, streamedOrpc } from './shared'

beforeEach(() => {
  vi.clearAllMocks()
})

it('.call', () => {
  expectTypeOf(orpc.ping.call).toEqualTypeOf(client.ping)
})

it('useSWR', async () => {
  const swr = useSWR(
    orpc.nested.ping.key({ input: { input: 123 } }),
    orpc.ping.fetcher(),
  )

  expectTypeOf(swr.data).toEqualTypeOf<{ output: string } | undefined>()

  // FIXME: this should error because invalid key
  useSWR(
    'invalid',
    orpc.ping.fetcher(),
  )
})

it('useSWRMutation', async () => {
  const mutation = useSWRMutation(
    orpc.nested.ping.key({ input: { input: 123 } }),
    orpc.ping.mutator(),
  )

  expectTypeOf<Parameters<typeof mutation.trigger>[0]>().toEqualTypeOf<{ input: number }>()
  expectTypeOf(mutation.data).toEqualTypeOf<{ output: string } | undefined>()
})

it('useSWRInfinite', async () => {
  const swr = useSWRInfinite(
    (index, previousPageData) => {
      // FIXME: this should be typed
      // expectTypeOf(previousPageData).toEqualTypeOf<{ output: string } | undefined>()

      return orpc.nested.ping.key({ input: { input: index + 1 } })
    },
    orpc.ping.fetcher(),
  )

  expectTypeOf(swr.data).toEqualTypeOf<Array<{ output: string }> | undefined>()
})

it('useSWRSubscription with subscriber', async () => {
  const subscription = useSWRSubscription(
    streamedOrpc.streamed.key({ input: { input: 3 } }),
    streamedOrpc.streamed.subscriber({ maxChunks: 2 }),
  )

  expectTypeOf(subscription.data).toEqualTypeOf<Array<{ output: string }> | undefined>()

  useSWRSubscription(
    'invalid',
    // @ts-expect-error: invalid key
    streamedOrpc.streamed.subscriber({ maxChunks: 2 }),
  )
})

it('useSWRSubscription with liveSubscriber', async () => {
  const subscription = useSWRSubscription(
    streamedOrpc.streamed.key({ input: { input: 3 } }),
    streamedOrpc.streamed.liveSubscriber(),
  )

  expectTypeOf(subscription.data).toEqualTypeOf<{ output: string } | undefined>()

  useSWRSubscription(
    'invalid',
    // @ts-expect-error: invalid key
    streamedOrpc.streamed.liveSubscriber(),
  )
})
