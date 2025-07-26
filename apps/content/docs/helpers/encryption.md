---
title: Encryption Helpers
description: Functions to encrypt and decrypt sensitive data using AES-GCM.
---

# Encryption Helpers

Encryption helpers provide functions to encrypt and decrypt sensitive data using AES-GCM with PBKDF2 key derivation.

::: info
Encryption prevents users from reading data content but is slower than [signing](/docs/helpers/signing).
:::

```ts twoslash
import { decrypt, encrypt } from '@orpc/server/helpers'

const secret = 'your-encryption-key'
const sensitiveData = 'user-email@example.com'

const encryptedData = await encrypt(sensitiveData, secret)
// 'Rq7wF8...' (base64url encoded, unreadable)

const decryptedData = await decrypt(encryptedData, secret)
// 'user-email@example.com'
```

::: info
The `decrypt` helper accepts `undefined` or `null` as encrypted value and returns `undefined` for invalid inputs, enabling seamless handling of optional data.
:::
