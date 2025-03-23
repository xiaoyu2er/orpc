<script setup lang="ts">
import { useElementSize, useLocalStorage, useWindowScroll } from '@vueuse/core'
import { computed, ref, watchEffect } from 'vue'

const container = ref<HTMLElement>()
const { y } = useWindowScroll()
const { height } = useElementSize(container)
const layoutTopHeight = computed(() => Math.max(0, height.value - y.value))

watchEffect(() => {
  document.documentElement.style.setProperty('--vp-layout-top-height', `${layoutTopHeight.value}px`)
})

const show = ref(false)
const bannerDismissed = useLocalStorage<string>(`banner-dismissed-at`, '')

watchEffect(() => {
  if (!bannerDismissed.value) {
    show.value = true
  }

  if (Number(bannerDismissed.value) + 60 * 60 * 24 * 3 * 1000 > Date.now()) {
    show.value = false
  }
})

function dismissBanner() {
  bannerDismissed.value = Date.now().toString()
  show.value = false
}
</script>

<template>
  <div v-show="show" ref="container" class="banner-container">
    <div class="banner">
      <div class="banner-content">
        <div class="banner-text">
          Serverless API Gateway, designed for developers -
        </div>

        <a class="banner-action" href="https://zuplo.com/" target="_blank" rel="noopener">
          Try Zuplo
        </a>
      </div>

      <button type="button" class="banner-close" @click="dismissBanner">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path
            d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.banner-container {
  background: linear-gradient(to right, var(--vp-c-brand-2), var(--vp-c-brand-3));
  color: var(--vp-c-white);
}

.banner {
  max-width: calc(var(--vp-layout-max-width) - 64px);
  position: relative;
  margin-right: auto;
  margin-left: auto;
  z-index: var(--vp-z-index-layout-top);
  display: flex;
  justify-content: center;
  align-items: center;
}

.banner-content {
  flex: 1 1 auto;
  display: flex;
  justify-content: center;
  align-items: center;
}

.banner-text {
  font-size: 16px;
  font-weight: 600;
}

.banner-action {
  margin-left: 2px;
  color: #ff2da0;
  font-weight: 700;
  text-decoration: underline;
}

.banner-action:hover {
  transition: filter 0.2s ease;
  filter: brightness(1.1);
}

.banner-action svg {
  margin-left: 8px;
  height: 20px;
  width: 20px;
}

.banner-close {
  position: absolute;
  top: 50%;
  right: 18px;
  transform: translateY(-50%);
}

.banner-close svg {
  width: 20px;
  height: 20px;
  fill: var(--vp-c-white);
}
</style>
