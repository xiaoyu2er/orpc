---
title: RPC Protocol
description: Learn about the RPC protocol used by RPCHandler.
---

# RPC Protocol

The RPC protocol enables remote procedure calls over HTTP using JSON, supporting native data types. It is utilized by [RPCHandler](/docs/rpc-handler).

## Request

### Example using POST

```bash
curl -X POST https://example.com/rpc/planet/create \
  -H 'Content-Type: application/json' \
  -d '{
    "json": {
      "name": "Earth",
      "detached_at": "2022-01-01T00:00:00.000Z"
    },
    "meta": [
      ["detached_at", "date"]
    ]
  }'
```

This request targets the `create` procedure within the `planet` module. The JSON payload includes `name` and `detached_at`, where `detached_at` is flagged as a date and will be converted to a Date object upon deserialization.

## Success Response

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "json": {
    "id": "1",
    "name": "Earth",
    "detached_at": "2022-01-01T00:00:00.000Z"
  },
  "meta": [
    ["id", "bigint"],
    ["detached_at", "date"]
  ]
}
```

A success response has an HTTP status code between 200 and 299 and returns the procedure's output.

## Error Response

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "json": {
    "defined": false,
    "code": "INTERNAL_SERVER_ERROR",
    "status": 500,
    "message": "Internal server error",
    "data": {}
  },
  "meta": []
}
```

An error response uses an HTTP status code between 400 and 599 and returns an `ORPCError` object.

## Request Methods

Although the examples above use the `POST` method, the RPC protocol is method-agnostic. You can use any HTTP method. For example, here’s how to use a `GET` request with input in the URL:

```ts
const url = new URL('https://example.com/rpc/planet/create')

url.searchParams.append('data', JSON.stringify({
  json: {
    name: 'Earth',
    detached_at: '2022-01-01T00:00:00.000Z'
  },
  meta: [
    ['detached_at', 'date']
  ]
}))

const response = await fetch(url)
```

## File Upload/Download

When the payload includes files or blobs, it is sent as a `FormData` object with `data` and `maps` fields. In the `data` object, file placeholders appear as empty objects `{}`. The `maps` array maps file keys in the `FormData` to their corresponding paths in the `data` object.

```ts
const form = new FormData()

form.set('data', JSON.stringify({
  json: {
    name: 'Earth',
    detached_at: '2022-01-01T00:00:00.000Z',
    thumbnail: {},
    images: [{}, {}]
  },
  meta: [
    ['detached_at', 'date']
  ]
}))

form.set('maps', JSON.stringify([
  ['json', 'thumbnail'],
  ['json', 'images', '0'],
  ['json', 'images', '1']
]))

form.set('0', new Blob([''], { type: 'image/png' }))
form.set('1', new Blob([''], { type: 'image/png' }))

const response = await fetch('https://example.com/rpc/planet/create', {
  method: 'POST',
  body: form
})
```

## Details

:::info
TODO
:::
