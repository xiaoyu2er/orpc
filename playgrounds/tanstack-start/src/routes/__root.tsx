import { createRootRoute, HeadContent, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({
  errorComponent: ({ error }) => {
    return (
      <RootDocument>
        <p>
          Error:
          {error.message}
        </p>
      </RootDocument>
    )
  },
  notFoundComponent: () => <div>404</div>,
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
