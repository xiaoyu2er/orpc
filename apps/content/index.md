---
title: oRPC - Typesafe APIs Made Simple 🪄
titleTemplate: ':title'
head:
  - ['meta', { property: 'og:description', content: 'oRPC makes it easy to build APIs that are end-to-end type-safe and adhere to OpenAPI standards, ensuring a smooth and enjoyable developer experience.' }]
layout: home
hero:
  name: oRPC
  text: Typesafe APIs Made Simple 🪄
  tagline: Easy to build APIs that are end-to-end type-safe and adhere to OpenAPI standards, ensuring a smooth and enjoyable developer experience.
  image:
    light: /code-light.png
    dark: /code-dark.png
    alt: oRPC Example
  actions:
    - theme: brand
      text: Get Started
      link: /docs/getting-started
    - theme: alt
      text: Playgrounds
      link: /docs/playgrounds
features:
  - icon: 🔒
    title: End-to-End Type Safety
    details: Ensure complete type safety from inputs to outputs and errors, bridging server and client seamlessly.
  - icon: 📄
    title: First-Class OpenAPI
    details: Adheres to the OpenAPI standard out of the box, ensuring seamless integration and comprehensive API documentation.
  - icon: 📜
    title: Contract-First Development
    details: (Optional) Define your API contract upfront and implement it with confidence.
  - icon: ✨
    title: Exceptional Developer Experience
    details: Enjoy a streamlined workflow with robust typing and clear, in-code documentation.
  - icon: 🌍
    title: Multi-Runtime Support
    details: Run your code seamlessly on Cloudflare, Deno, Bun, Node.js, and more.
  - icon: 🧩
    title: Framework Integrations
    details: Supports Tanstack Query (React, Vue, Solid, Svelte), Pinia Colada, and more.
  - icon: ⚡
    title: Server Actions
    details: Fully compatible with React Server Actions on Next.js, TanStack Start, and more.
  - icon: 🗂️
    title: Standard Schema Support
    details: Effortlessly work with Zod, Valibot, ArkType, and others right out of the box.
  - icon: 💨
    title: Fast & Lightweight
    details: Built on native APIs across all runtimes – optimized for speed and efficiency.
  - icon: 📦
    title: Native Types
    details: Enjoy built-in support for Date, File, Blob, BigInt, URL and more with no extra setup.
  - icon: ⏱️
    title: Lazy Router
    details: Improve cold start times with our lazy routing feature.
  - icon: 📡
    title: SSE & Streaming
    details: Provides SSE and streaming features – perfect for real-time notifications and AI-powered streaming responses.
  - icon: 🔄
    title: Reusability
    details: Write once and reuse your code across multiple purposes effortlessly.
  - icon: 🔌
    title: Extendability
    details: Easily enhance oRPC with plugins, middleware, and interceptors.
  - icon: 🛡️
    title: Reliability
    details: Well-tested, fully TypeScript, production-ready, and MIT licensed for peace of mind.
  - icon: 💡
    title: Simplicity
    details: Enjoy straightforward, clean code with no hidden magic.
---

<script setup>
import FullSponsors from './.vitepress/theme/components/FullSponsors.vue'
</script>

<FullSponsors />
