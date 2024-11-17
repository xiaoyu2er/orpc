import { homeSource } from '@/lib/source'
import { cn } from '@/utils/cn'
import { Popup, PopupContent, PopupTrigger } from 'fumadocs-twoslash/ui'
import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock'
import { Tab, Tabs } from 'fumadocs-ui/components/tabs'
import Link from 'next/link'

const mdxComponents = {
  pre: ({ children, ...props }: React.ComponentProps<'pre'>) => (
    <CodeBlock {...props}>
      <Pre className="max-h-[37.5rem]">{children}</Pre>
    </CodeBlock>
  ),
  Popup,
  PopupContent,
  PopupTrigger,
  Tab,
  Tabs: ({ children, ...props }: React.ComponentProps<typeof Tabs>) => (
    <Tabs
      {...props}
      className={cn(props.className, 'border-none rounded-none')}
    >
      {children}
    </Tabs>
  ),
}

export default function HomePage() {
  const server = homeSource.getPage(['server'])!
  const ServerMDX = server.data.body
  const client = homeSource.getPage(['client'])!
  const ClientMDX = client.data.body

  return (
    <main className="container">
      <div className="mx-auto lg:col-span-6 lg:flex lg:items-center justify-center text-center">
        <div className="relative z-10 lg:h-auto pt-[90px] lg:pt-[90px] lg:min-h-[300px] flex flex-col items-center justify-center sm:mx-auto md:w-3/4 lg:mx-0 lg:w-full gap-4 lg:gap-8">
          <div className="flex flex-col items-center">
            <h1 className="max-w-5xl text-foreground text-4xl sm:text-5xl sm:leading-none lg:text-6xl">
              <span className="block text-foreground">
                End-to-end typesafe APIs builder,
              </span>
              <span className="block md:ml-0">Developer-first simplicity</span>
            </h1>
            <p className="max-w-2xl pt-2 text-foreground my-3 text-xs sm:mt-5 lg:mb-0 sm:text-sm lg:text-base">
              oRPC is an open-source solution for building modern, typesafe
              APIs.
              <br className="hidden md:block" />
              Build robust, scalable APIs and expose them to the internet with
              typesafe clients and full OpenAPI support.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              data-size="medium"
              type="button"
              className="relative justify-center cursor-pointer inline-flex items-center space-x-2 text-center font-regular ease-out duration-200 rounded-md outline-none transition-all outline-0 focus-visible:outline-4 focus-visible:outline-offset-1 border bg-brand-400 dark:bg-brand-500 hover:bg-brand/80 dark:hover:bg-brand/50 text-foreground border-brand-500/75 dark:border-brand/30 hover:border-brand-600 dark:hover:border-brand focus-visible:outline-brand-600 data-[state=open]:bg-brand-400/80 dark:data-[state=open]:bg-brand-500/80 data-[state=open]:outline-brand-600 text-sm px-4 py-2 h-[38px]"
              href="https://github.com/unnoq/orpc"
              rel="noreferrer noopener"
              target="_blank"
            >
              <span className="truncate">View on GitHub</span>
            </a>
            <Link
              data-size="medium"
              type="button"
              className="relative justify-center cursor-pointer inline-flex items-center space-x-2 text-center font-regular ease-out duration-200 rounded-md outline-none transition-all outline-0 focus-visible:outline-4 focus-visible:outline-offset-1 border text-foreground bg-alternative dark:bg-muted hover:bg-selection border-strong hover:border-stronger focus-visible:outline-brand-600 data-[state=open]:bg-selection data-[state=open]:outline-brand-600 data-[state=open]:border-button-hover text-sm px-4 py-2 h-[38px]"
              href="/docs"
            >
              <span className="truncate">Quick start</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-24 flex justify-center">
        <div className="min-[1247px]:flex flex-wrap justify-center rounded-md overflow-hidden ring-foreground/10 ring-1">
          <div className="w-[37.5rem] -mt-4 -mb-4 overflow-auto">
            <ServerMDX components={mdxComponents} />
          </div>
          <div className="w-[37.5rem] -mt-4 -mb-4 overflow-auto">
            <ClientMDX components={mdxComponents} />
          </div>
        </div>
      </div>

      {/* <div className="mt-24 grid grid-cols-6 gap-4">
        <div className="col-span-6 lg:col-span-4 h-64 bg-card ring-1 ring-foreground/10 rounded-md">
          End-to-end typesafe APIs
        </div>
        <div className="col-span-6 md:col-span-3 lg:col-span-2 h-64 bg-card ring-1 ring-foreground/10 rounded-md">
          First class OpenAPI supports
        </div>
        <div className="col-span-6 md:col-span-3 lg:col-span-2 h-64 bg-card ring-1 ring-foreground/10 rounded-md">
          Upload/Download Files supports
        </div>
        <div className="col-span-6 md:col-span-3 lg:col-span-2 h-64 bg-card ring-1 ring-foreground/10 rounded-md">
          Framework agnostic
        </div>
        <div className="col-span-6 md:col-span-3 lg:col-span-2 h-64 bg-card ring-1 ring-foreground/10 rounded-md">
          Server Actions supports
        </div>
      </div> */}
    </main>
  )
}
