import type { Metadata } from 'next'
import { RootProvider } from 'fumadocs-ui/provider'

import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import './global.css'
import 'fumadocs-twoslash/twoslash.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://orpc.unnoq.com'),
  title: {
    default: 'oRPC - End-to-end typesafe APIs builder',
    template: '%s - oRPC',
  },
  description:
    'oRPC is an open-source solution for building modern, typesafe APIs. Build robust, scalable APIs and expose them to the internet with typesafe clients and full OpenAPI support.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} font-sans`}
      suppressHydrationWarning
    >
      <body className="flex flex-col min-h-screen">
        <RootProvider
          search={{
            options: {
              type: 'static',
            },
          }}
        >
          {children}
        </RootProvider>
      </body>
    </html>
  )
}
