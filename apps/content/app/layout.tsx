import type { Metadata } from 'next'
import { Banner } from 'fumadocs-ui/components/banner'

import { RootProvider } from 'fumadocs-ui/provider'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import './global.css'
import 'fumadocs-twoslash/twoslash.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://orpc.unnoq.com'),
  title: {
    default: `oRPC - Typesafe API's Made Simple 🪄`,
    template: '%s - oRPC',
  },
  description:
    `End-to-End Typesafe API's made easy in a toolkit that helps developers build robust TypeScript API's with a focus on developer experience, reliability.`,
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} font-sans`}
      suppressHydrationWarning
    >
      <body className="flex flex-col min-h-screen">
        <Banner>
          oRPC is currently pre-stable, please report any issues on our
          {' '}
          {' '}
          Discord or GitHub 🚧
        </Banner>
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
