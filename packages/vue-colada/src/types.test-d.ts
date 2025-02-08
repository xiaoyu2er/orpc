import type { MaybeRefDeep } from './types'
import { computed, ref, shallowRef } from 'vue'

it('MaybeDeepRef', () => {
  expectTypeOf(1).toMatchTypeOf<MaybeRefDeep<number>>()
  expectTypeOf(ref(1)).toMatchTypeOf<MaybeRefDeep<number>>()
  expectTypeOf(computed(() => 1)).toMatchTypeOf<MaybeRefDeep<number>>()
  expectTypeOf(shallowRef(1)).toMatchTypeOf<MaybeRefDeep<number>>()

  expectTypeOf({ val: { val: 'string' } }).toMatchTypeOf<MaybeRefDeep<{ val: { val: string } }>>()
  expectTypeOf({ val: { val: ref('string') } }).toMatchTypeOf<MaybeRefDeep<{ val: { val: string } }>>()
  expectTypeOf({ val: ref({ val: ref('string') }) }).toMatchTypeOf<MaybeRefDeep<{ val: { val: string } }>>()

  expectTypeOf(computed(() => ({ val: ref({ val: ref('string') }) }))).toMatchTypeOf<MaybeRefDeep<{ val: { val: string } }>>()
  expectTypeOf(shallowRef({ val: ref({ val: ref('string') }) })).toMatchTypeOf<MaybeRefDeep<{ val: { val: string } }>>()
})
