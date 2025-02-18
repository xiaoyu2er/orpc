import { defineConfig } from 'vitepress'
import { groupIconMdPlugin, groupIconVitePlugin } from 'vitepress-plugin-group-icons'
import { withTwoslash } from 'vitepress-plugin-shiki-twoslash'

export default withTwoslash(defineConfig({
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
      { text: 'RPC', link: '/docs/rpc/getting-started', activeMatch: '/docs/rpc/' },
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
      '/docs/rpc/': [
        { text: 'Getting Started', link: '/docs/rpc/getting-started' },
      ],
      '/docs/openapi/': [
        { text: 'Getting Started', link: '/docs/openapi/getting-started' },
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
}))
