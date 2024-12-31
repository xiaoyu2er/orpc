import type { MaybeDeepRef } from './types'
import { computed, ref, shallowRef } from 'vue'

it('MaybeDeepRef', () => {
  expectTypeOf(1).toMatchTypeOf<MaybeDeepRef<number>>()
  expectTypeOf(ref(1)).toMatchTypeOf<MaybeDeepRef<number>>()
  expectTypeOf(computed(() => 1)).toMatchTypeOf<MaybeDeepRef<number>>()
  expectTypeOf(shallowRef(1)).toMatchTypeOf<MaybeDeepRef<number>>()

  expectTypeOf({ val: { val: 'string' } }).toMatchTypeOf<MaybeDeepRef<{ val: { val: string } }>>()
  expectTypeOf({ val: { val: ref('string') } }).toMatchTypeOf<MaybeDeepRef<{ val: { val: string } }>>()
  expectTypeOf({ val: ref({ val: ref('string') }) }).toMatchTypeOf<MaybeDeepRef<{ val: { val: string } }>>()

  expectTypeOf(computed(() => ({ val: ref({ val: ref('string') }) }))).toMatchTypeOf<MaybeDeepRef<{ val: { val: string } }>>()
  expectTypeOf(shallowRef({ val: ref({ val: ref('string') }) })).toMatchTypeOf<MaybeDeepRef<{ val: { val: string } }>>()
})
