---
title: Bracket Notation
description: Represent structured data in limited formats such as URL queries and form data.
---

# Bracket Notation

Bracket Notation allows you to represent structured data in limited formats such as URL queries and form data.
It is used with [OpenAPIHandler](/docs/openapi/openapi-handler) and [OpenAPILink](/docs/openapi/client/openapi-link).

## Basic Usage

### URL Query

```bash
curl http://example.com/api/example?name[first]=John&name[last]=Doe
```

This query is parsed as:

```json
{
  "name": {
    "first": "John",
    "last": "Doe"
  }
}
```

### Form Data

```bash
curl -X POST http://example.com/api/example \
  -F 'name[first]=John' \
  -F 'name[last]=Doe'
```

This form is parsed as:

```json
{
  "name": {
    "first": "John",
    "last": "Doe"
  }
}
```

## Arrays

Use either empty brackets `[]` or indexed brackets to express arrays. Missing indexes are filled with `null`.

::: warning
Arrays must contain at least one element.
:::

```bash
curl -X POST http://example.com/api/example \
  -F 'names[]=John' \
  -F 'names[]=Doe' \
  -F 'ages[0]=18' \
  -F 'ages[2]=25'
```

This query is parsed as:

```json
{
  "names": ["John", "Doe"],
  "ages": [18, null, 25]
}
```

## Objects

Wrap keys in brackets to express objects.

::: warning

- Objects must include at least one non-numeric key.
- Empty objects cannot be represented.

:::

```bash
curl -X POST http://example.com/api/example \
  -F 'name[first]=John' \
  -F 'name[last]=Doe' \
  -F 'name[nested][first]=John' \
  -F 'name[nested][last]=Doe'
```

This query is parsed as:

```json
{
  "name": {
    "first": "John",
    "last": "Doe",
    "nested": {
      "first": "John",
      "last": "Doe"
    }
  }
}
```

## Combining Arrays and Objects

You can mix arrays and objects as needed:

```bash
curl -X POST http://example.com/api/example \
  -F 'data[names][0][first]=John1' \
  -F 'data[names][0][last]=Doe1' \
  -F 'data[names][1][first]=John2' \
  -F 'data[names][1][last]=Doe2' \
  -F 'data[ages][0]=18' \
  -F 'data[ages][2]=25' \
  -F 'data[files][]=@/path/to/file1' \
  -F 'data[files][]=@/path/to/file2'
```

This query is parsed as:

```json
{
  "data": {
    "names": [
      { "first": "John1", "last": "Doe1" },
      { "first": "John2", "last": "Doe2" }
    ],
    "ages": [18, null, 25],
    "files": ["...binary data...", "...binary data..."]
  }
}
```
