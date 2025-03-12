---
title: Playgrounds
description: Interactive development environments for exploring and testing oRPC functionality.
---

# Playgrounds

Explore oRPC implementations through our interactive playgrounds,
featuring pre-configured examples accessible instantly via StackBlitz or local setup.

## Available Playgrounds

| Environment                      | StackBlitz                                                                                                                         | GitHub Source                                                                                           |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Next.js Playground               | [Open in StackBlitz](https://stackblitz.com/github/unnoq/orpc/tree/main/playgrounds/nextjs?file=src%2Fapp%2Fpage.tsx)              | [View Source](https://github.com/unnoq/orpc/tree/main/playgrounds/nextjs/src/app/page.tsx)              |
| Nuxt.js Playground               | [Open in StackBlitz](https://stackblitz.com/github/unnoq/orpc/tree/main/playgrounds/nuxt?file=server%2Frouter%2Findex.ts)          | [View Source](https://github.com/unnoq/orpc/tree/main/playgrounds/nuxt/server/router/index.ts)          |
| OpenAPI Playground               | [Open in StackBlitz](https://stackblitz.com/github/unnoq/orpc/tree/main/playgrounds/openapi?file=src%2Frouter%2Findex.ts)          | [View Source](https://github.com/unnoq/orpc/tree/main/playgrounds/openapi/src/router/index.ts)          |
| OpenAPI with Contract Playground | [Open in StackBlitz](https://stackblitz.com/github/unnoq/orpc/tree/main/playgrounds/contract-openapi?file=src%2Frouter%2Findex.ts) | [View Source](https://github.com/unnoq/orpc/tree/main/playgrounds/contract-openapi/src/router/index.ts) |
| Express.js Playground            | [Open in StackBlitz](https://stackblitz.com/github/unnoq/orpc/tree/main/playgrounds/expressjs?file=src%2Frouter%2Findex.ts)        | [View Source](https://github.com/unnoq/orpc/tree/main/playgrounds/expressjs/src/router/index.ts)        |
| Solid Start Playground           | [Open in StackBlitz](https://stackblitz.com/github/unnoq/orpc/tree/main/playgrounds/solid-start?file=src%2Frouter%2Findex.ts)      | [View Source](https://github.com/unnoq/orpc/tree/main/playgrounds/solid-start/src/router/index.ts)      |

:::warning
StackBlitz has own limitations, so some features may not work as expected.
:::

## Local Development

If you prefer working locally, you can clone any playground using the following commands:

```bash
# Clone specific playground environments
npx degit unnoq/orpc/playgrounds/nextjs orpc-nextjs-playground
npx degit unnoq/orpc/playgrounds/nuxt orpc-nuxt-playground
npx degit unnoq/orpc/playgrounds/openapi orpc-openapi-playground
npx degit unnoq/orpc/playgrounds/contract-openapi orpc-contract-openapi-playground
npx degit unnoq/orpc/playgrounds/expressjs orpc-expressjs-playground
npx degit unnoq/orpc/playgrounds/solid-start orpc-solid-start-playground
```

For each project, set up the development environment:

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

That's it! You can now access the playground at `http://localhost:3000`.
