---
title: Going live
description: Move from sandbox to production.
section: Guides
order: 14
---

# Going live

1. Complete onboarding with Nagad and get production credentials and the production API base URL.
2. Register your callback URL and public key, and whitelist your egress IP (or your proxy's IP).
3. Put keys and IDs in your secret manager.
4. Complete the [production checklist](../security/#production-checklist).
5. Deploy with a persistent session store.
6. Make **one small real payment** and check it in the merchant portal and in your own records.
7. Watch for `unknown` outcomes and reconcile them.

Nagad's API host is never hard-coded in the SDK, so switching environments is a configuration change only.
