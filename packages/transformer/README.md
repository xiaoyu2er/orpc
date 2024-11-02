# `@orpc/transformer`

A library for transforming oRPC payloads in different client-server scenarios.

## Overview

`@orpc/transformer` provides two distinct sets of serializers and deserializers for different use cases:
1. `ORPC` serializer/deserializer designed for internal oRPC clients and servers to communicate with each other.
2. `OpenAPI` serializer/deserializer designed for external clients consuming the API through OpenAPI specifications.

```ts
import { ORPCSerializer, ORPCDeserializer } from '@orpc/transformer'

const serializer = new ORPCSerializer() // or OpenAPISerializer
const deserializer = new ORPCDeserializer() // or OpenAPIDeserializer

export async function fetch(request: Request) {
  const input = await deserializer.deserialize(request)

  const output = { some: 'data', file: new File([], 'file.txt'), date: new Date() }

  const { body, contentType } = serializer.serialize(output)

  return new Response(body, {
    headers: {
      'Content-Type': contentType,
    },
  })
}
```

## Types Supported

- `string`
- `number` (include `NaN`)
- `boolean`
- `null`
- `undefined`
- `Date` (include `Invalid Date`)
- `BigInt`
- `Set`
- `Map`
- `Blob`
- `File`

## Implementations

### oRPC Serializer/Deserializer

The primary implementation designed specifically for communication between oRPC clients and servers.
This implementation is most powerful, but the payload is not human-readable.

### OpenAPI Serializer/Deserializer

An implementation designed for external clients consuming the API through OpenAPI specifications. This is used when developers manually create HTTP requests based on the OpenAPI documentation.

The payload is human-readable, but the implementation is slower and requires provide `schema` to archive the same functionality as oRPC implementation.

With the wide of `content-type` support by OpenAPI, required user learns [Bracket Notation](#bracket-notation) to represent nested structures in some limited cases.

## Bracket Notation

Bracket notation is a syntax used to represent nested structures in some limited cases.

```ts
const payload = {
  user: {
    name: 'John Doe',
    age: 30,
  },
  avatar: new File([], 'avatar.png'),
  friends: ['Alice', 'Bob'],
}

// with bracket notation 

{
  'user[name]': 'John Doe',
  'user[age]': 30,
  'avatar': new File([], 'avatar.png'),
  'friends[]': 'Alice',
  'friends[]': 'Bob',
}
```
