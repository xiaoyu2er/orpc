---
title: Lifecycle
description: Master the oRPC lifecycle to confidently implement and customize your procedures.
---

# Lifecycle

Master the oRPC lifecycle to confidently implement and customize your procedures.

## Overview

<img src="/orpc-lifecycle.svg" alt="oRPC Lifecycle" style="margin: 1rem auto;" />

| Name                    | Description                                                                            | Customizable |
| ----------------------- | -------------------------------------------------------------------------------------- | ------------ |
| **Handler**             | Procedures defined with `.handler`.                                                    | ✅           |
| **Middlewares**         | Procedures added via `.use`.                                                           | ✅           |
| **Input Validation**    | Validates input data against the schema specified in `.input`.                         | 🟡           |
| **Output Validation**   | Ensures output data conforms to the schema defined in `.output`.                       | 🟡           |
| **Client Interceptors** | Interceptors executed before Error Validation.                                         | ✅           |
| **Error Validation**    | Flags errors as defined and validate error data if they match the schema in `.errors`. | 🟡           |
| **Routing**             | Determines which procedure to execute based on the incoming request.                   | ✅           |
| **Interceptors**        | Interceptors executed before the Error Handler.                                        | ✅           |
| **Error Handler**       | Catches errors and converts them into a response.                                      | 🟡           |
| **Root Interceptors**   | Modify the request or response as needed.                                              | ✅           |

> **Note:** The components _Routing_, _Interceptors_, _Error Handler_, and _Root Interceptors_ are not available when using the [server-side client](/docs/client/server-side).

## Middlewares Order

To ensure that all middlewares run after input validation and before output validation apply the following configuration:

```ts
const base = os.$config({
  initialInputValidationIndex: Number.NEGATIVE_INFINITY,
  initialOutputValidationIndex: Number.NEGATIVE_INFINITY,
})
```

:::info
By default, oRPC executes middlewares based on their registration order relative to validation steps. Middlewares registered before `.input` run before input validation, and those registered after `.output` run before output validation.
:::
