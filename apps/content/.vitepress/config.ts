import { transformerTwoslash } from '@shikijs/vitepress-twoslash'
import { defineConfig } from 'vitepress'
import { groupIconMdPlugin, groupIconVitePlugin } from 'vitepress-plugin-group-icons'

export default defineConfig({
  lang: 'en-US',
  title: 'oRPC',
  description:
    'oRPC makes it easy to build APIs that are end-to-end type-safe and adhere to OpenAPI standards, ensuring a smooth and enjoyable developer experience.',
  lastUpdated: true,
  ignoreDeadLinks: true,
  cleanUrls: true,
  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
    config(md) {
      md.use(groupIconMdPlugin)
    },
    codeTransformers: [
      transformerTwoslash(),
    ],
  },
  themeConfig: {
    logo: '/logo.webp',
    siteTitle: '',
    socialLinks: [
      { icon: 'github', link: 'https://github.com/unnoq/orpc' },
      { icon: 'discord', link: 'https://discord.gg/TXEbwRBvQn' },
      { icon: 'x', link: 'https://x.com/unnoqcom' },
      { icon: 'bluesky', link: 'https://bsky.app/profile/unnoq.com' },
    ],
    editLink: {
      pattern: 'https://github.com/unnoq/orpc/blob/main/apps/content/:path',
      text: 'Edit on GitHub',
    },
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present Unnoq & oRPC contributors.',
    },
    nav: [
      { text: 'Docs', link: '/docs/getting-started', activeMatch: '/docs/(?!openapi/)' },
      { text: 'OpenAPI', link: '/docs/openapi/getting-started', activeMatch: '/docs/openapi/' },
      { text: 'Examples', link: '/examples/', activeMatch: '/examples/' },
      { text: 'Sponsor', link: '/sponsor' },
      {
        text: 'About',
        items: [
          { text: 'Motivation', link: '/motivation' },
          { text: 'Releases', link: 'https://github.com/unnoq/orpc/releases' },
        ],
      },
      { text: 'Discussions', link: 'https://github.com/unnoq/orpc/discussions' },
    ],
    sidebar: {
      '/docs/': [
        { text: 'Getting Started', link: '/docs/getting-started' },
        { text: 'Procedure', link: '/docs/procedure' },
        { text: 'Router', link: '/docs/router' },
        { text: 'Middleware', link: '/docs/middleware' },
        { text: 'Context', link: '/docs/context' },
        { text: 'Error Handling', link: '/docs/error-handling' },
        { text: 'File Upload/Download', link: '/docs/file-upload-download' },
        { text: 'Event Iterator (SSE)', link: '/docs/event-iterator' },
        { text: 'Server Action', link: '/docs/server-action' },
        { text: 'RPC Handler', link: '/docs/rpc-handler' },
        { text: 'Lifecycle', link: '/docs/lifecycle' },
        {
          text: 'Contract First',
          collapsed: true,
          items: [
            { text: 'Define Contract', link: '/docs/contract-first/define-contract' },
            { text: 'Implement Contract', link: '/docs/contract-first/implement-contract' },
          ],
        },
        {
          text: 'Integrations',
          collapsed: true,
          items: [
            { text: 'Fetch server', link: '/docs/integrations/fetch-server' },
            { text: 'Node', link: '/docs/integrations/node' },
            { text: 'Bun', link: '/docs/integrations/bun' },
            { text: 'Cloudflare Workers', link: '/docs/integrations/cloudflare-workers' },
            { text: 'Deno', link: '/docs/integrations/deno' },
            { text: 'Express', link: '/docs/integrations/express' },
            { text: 'Next.js', link: '/docs/integrations/nextjs' },
            { text: 'Nuxt', link: '/docs/integrations/nuxt' },
            { text: 'Hono', link: '/docs/integrations/hono' },
            { text: 'Tanstack Start', link: '/docs/integrations/tanstack-start' },
            { text: 'Elysia', link: '/docs/integrations/elysia' },
            { text: 'SvelteKit', link: '/docs/integrations/svelte-kit' },
            { text: 'Remix', link: '/docs/integrations/remix' },
            { text: 'SolidStart', link: '/docs/integrations/solid-start' },
          ],
        },
        {
          text: 'Plugins',
          collapsed: true,
          items: [
            { text: 'CORS', link: '/docs/plugins/cors' },
            { text: 'Response Headers', link: '/docs/plugins/response-headers' },
          ],
        },
        {
          text: 'Client',
          collapsed: true,
          items: [
            { text: 'Server-Side', link: '/docs/client/server-side' },
            { text: 'Client-Side', link: '/docs/client/client-side' },
            { text: 'Error Handling', link: '/docs/client/error-handling' },
            { text: 'Event Iterator', link: '/docs/client/event-iterator' },
            { text: 'RPC Link', link: '/docs/client/rpc-link' },
            { text: 'Dynamic Link', link: '/docs/client/dynamic-link' },
          ],
        },
        {
          text: 'Tanstack Query',
          collapsed: true,
          items: [
            { text: 'Basic', link: '/docs/tanstack-query/basic' },
            { text: 'React', link: '/docs/tanstack-query/react' },
            { text: 'Vue', link: '/docs/tanstack-query/vue' },
          ],
        },
        {
          text: 'Advanced',
          collapsed: true,
          items: [
            { text: 'Validation Errors', link: '/docs/advanced/validation-errors' },
            { text: 'RPC Protocol', link: '/docs/advanced/rpc-protocol' },
          ],
        },
        {
          text: 'Others',
          collapsed: true,
          items: [
            { text: 'Pinia Colada', link: '/docs/pinia-colada' },
            { text: 'Playgrounds', link: '/docs/playgrounds' },
            { text: 'Comparison', link: '/docs/comparison' },
          ],
        },
      ],
      '/docs/openapi/': [
        { text: 'Getting Started', link: '/docs/openapi/getting-started' },
        { text: 'Routing', link: '/docs/openapi/routing' },
        { text: 'Input/Output Structure', link: '/docs/openapi/input-output-structure' },
        { text: 'Error Handling', link: '/docs/openapi/error-handling' },
        { text: 'Bracket Notation', link: '/docs/openapi/bracket-notation' },
        { text: 'OpenAPI Handler', link: '/docs/openapi/openapi-handler' },
        { text: 'OpenAPI Specification', link: '/docs/openapi/openapi-specification' },
        {
          text: 'Plugins',
          collapsed: true,
          items: [
            { text: 'Zod Auto Coerce', link: '/docs/openapi/plugins/zod-auto-coerce' },
          ],
        },
        {
          text: 'Client',
          collapsed: true,
          items: [
            { text: 'OpenAPI Link', link: '/docs/openapi/client/openapi-link' },
          ],
        },
      ],
      '/examples/': [

      ],
    },
  },
  head: [
    ['meta', { property: 'og:image', content: 'https://orpc.unnoq.com/og.jpg' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'twitter:domain', content: 'orpc.unnoq.com' }],
    ['meta', { property: 'twitter:image', content: 'https://orpc.unnoq.com/og.jpg' }],
    ['meta', { property: 'twitter:card', content: 'summary_large_image' }],
    ['link', { rel: 'shortcut icon', href: '/icon.svg', type: 'image/svg+xml' }],
  ],
  titleTemplate: ':title - oRPC',
  vite: {
    plugins: [
      groupIconVitePlugin({
        customIcon: {
          cloudflare: 'logos:cloudflare-workers-icon',
        },
      }),
    ],
  },
})
