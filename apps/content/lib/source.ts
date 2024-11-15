import { docs, home, meta } from '@/.source'
import * as icons from '@/components/icons'
import { IconContainer } from '@/components/ui/icon'
import { loader } from 'fumadocs-core/source'
import { createMDXSource } from 'fumadocs-mdx'
import { createElement } from 'react'

export const source = loader({
  baseUrl: '/docs',
  source: createMDXSource(docs, meta),
  icon(icon) {
    if (icon && icon in icons)
      return createElement(IconContainer, {
        icon: icons[icon as keyof typeof icons],
      })
  },
})

export const homeSource = loader({
  source: createMDXSource(home, home),
})
