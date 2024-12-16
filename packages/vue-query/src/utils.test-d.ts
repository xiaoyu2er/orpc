import { computed, ref, shallowRef } from 'vue'
import { deepUnref } from './utils'

it('deepUnref', () => {
  expectTypeOf(deepUnref(1)).toMatchTypeOf<number>()
  expectTypeOf(deepUnref('1')).toMatchTypeOf<string>()

  expectTypeOf(deepUnref(ref(1))).toMatchTypeOf<number>()
  expectTypeOf(deepUnref({ val: ref(1) })).toMatchTypeOf<{ val: number }>()
  expectTypeOf(deepUnref({ val: { val: ref(1) } })).toMatchTypeOf<{ val: { val: number } }>()
  expectTypeOf(deepUnref({ val: ref({ val: ref(1) }) })).toMatchTypeOf<{ val: { val: number } }>()

  expectTypeOf(deepUnref({ val: computed(() => ref(1)) })).toMatchTypeOf<{ val: number }>()
  expectTypeOf(deepUnref(computed(() => ({ val: ref({ val: ref(1) }) })))).toMatchTypeOf<{ val: { val: number } }>()
  expectTypeOf(deepUnref(computed(() => ({ val: ref({ val: shallowRef(1) }) })))).toMatchTypeOf<{ val: { val: number } }>()
  expectTypeOf(deepUnref(computed(() => ({ val: shallowRef({ val: ref(1) }) })))).toMatchTypeOf<{ val: { val: number } }>()
})
