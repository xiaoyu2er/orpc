# `@orpc/transformer`

A library for transforming oRPC payloads in different client-server scenarios.

## Overview

`@orpc/transformer` provides two distinct transformers for different use cases:
1. Internal communication between oRPC clients and servers
2. External API access through OpenAPI specifications

## Key Features

- **Native Type Support**
  - `Date`
  - `BigInt`
  - `Set`
  - `Map`
  - `Blob`
  - `File`
- **File Operations**
  - Single and multiple file upload/download
  - Automatic `multipart/form-data` handling

## Transformers

### oRPC Transformer

The primary transformer designed specifically for communication between oRPC clients and oRPC servers.

**Purpose:**
- Used internally by oRPC clients to communicate with oRPC servers
- Handles complex type serialization automatically
- Provides full type safety and conversion

**Benefits:**
- Maximum type support
- Efficient serialization
- Automatic handling of complex types
- Type safety between client and server

### OpenAPI Transformer

A transformer designed for external clients consuming the API through OpenAPI specifications. This is used when developers manually create HTTP requests based on the OpenAPI documentation.

**Purpose:**
- Used when making manual HTTP requests to an oRPC server
- Provides human-readable payload formats
- Supports standard HTTP clients and fetch requests

**Server-Side Behavior:**

Thanks to @orpc/zod, the server can handle OpenAPI requests with the same capabilities as the oRPC transformer.

**Client-Side Limitations:**
When making manual requests, clients must handle:

1. Manual type conversions for:
   - Dates (sent as ISO strings)
   - BigInt (sent as strings)
   - Sets and Maps (sent as arrays)
   - Binary data (using appropriate encoding)

2. `form-data` required use of bracket notation for nested structures.

## Bracket Notation

When using `form-data` with manual requests, bracket notation is required for nested structures.

### Syntax Examples

- `{ a: { b: 1 } }` => `{ 'a[b]': 1 }`
- `{ a: [1, 2] }` => `{ 'a[0]': 1, 'a[1]': 2 }`
- `{ 'a[b]' : 1 }` => `{ a: { b: 1 } }`
- `{ 'a[]' : 1, 'a[]' : 2 }` => `{ a: [1, 2] }`
- `{ 'a[0]' : 1, 'a[1]' : 2 }` => `{ a: [1, 2] }`

### Limitations

**When Sending Requests:**
Limitations that only effect when you `deserialize` the payload. oRPC server still affects by these limitations
but with the help of [@orpc/zod](../zod/README.md) can remove these limitations.

- Cannot express empty array or object (`{}` and `[]`).
- `[]` at end can express both object with `''` empty key or an element of array, so can mislead in some cases.

**When Handling Responses:**
Limitations that only effect when you `serialize` the payload or when responding from oRPC server.

- Cannot express empty array or object (`{}` and `[]`).
