import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'
import { Bluesky, Discord, Twitter } from '@/components/icons'

/**
 * Shared layout configurations
 *
 * you can configure layouts individually from:
 * Home Layout: app/(home)/layout.tsx
 * Docs Layout: app/docs/layout.tsx
 */
export const baseOptions: BaseLayoutProps = {
  githubUrl: 'https://github.com/unnoq/orpc',
  nav: {
    title: 'oRPC',
  },
  links: [
    {
      text: 'Documentation',
      url: '/docs',
      active: 'nested-url',
    },
    {
      text: 'Playground',
      url: '/docs/playground',
      active: 'nested-url',
    },
    {
      type: 'icon',
      url: 'https://discord.gg/TXEbwRBvQn',
      text: 'Discord',
      icon: Discord({ }),
      external: true,
    },
    {
      type: 'icon',
      url: 'https://bsky.app/profile/unnoq.com',
      text: 'Bluesky',
      icon: Bluesky({}),
      external: true,
    },
    {
      type: 'icon',
      url: 'https://x.com/unnoqcom',
      text: 'Twitter',
      icon: Twitter({ className: '!size-4' }),
      external: true,
    },
  ],
}
