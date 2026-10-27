---
"nagad-server": minor
"nagad-client": minor
---

`nagad-client`: a callback is no longer treated as a successful payment. `handleCallback` moves to `verifying`; call `confirmSuccess()` after your server verified (or `confirmPending()` if it could not tell). Adds the `pending` state and the `onCallback` hook.

`nagad-server`: the callback route returns a minimal public result (no `rawResponse`, no wallet numbers). Adds the documentation site, generated status table, error reference and package READMEs.
