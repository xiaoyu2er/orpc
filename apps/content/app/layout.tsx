import './global.css'
import 'fumadocs-twoslash/twoslash.css'

import { RootProvider } from 'fumadocs-ui/provider'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'

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
