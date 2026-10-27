---
title: Fixed egress and proxy
description: Satisfy Nagad's IP whitelist from serverless or autoscaled platforms.
section: Guides
order: 7
---

# Fixed egress and proxy

Nagad's production API only accepts calls from whitelisted server IP addresses. If your platform's outbound IP changes (serverless functions, autoscaling groups), route only the Nagad calls through a small proxy that has a fixed public IP.

## Recipe

1. Run a forward proxy (for example Squid or a tiny HTTP CONNECT proxy) on a VM with a static public IP. Restrict it so only your application can connect (private network, firewall, or proxy authentication).
2. Give that IP to Nagad for whitelisting.
3. Tell the SDK to use it:

```ts
import { createNagad } from 'nagad-server';
import { createForwardProxyFetch } from 'nagad-server/proxy';

const nagad = createNagad({
  /* credentials */
  serverIp: process.env.NAGAD_EGRESS_IP, // the proxy's public IP
  fetch: createForwardProxyFetch({
    proxyUrl: process.env.NAGAD_PROXY_URL!, // http://proxy.internal:8080
    proxyAuth: process.env.NAGAD_PROXY_AUTH, // optional Proxy-Authorization value
  }),
});
```

The proxy tunnels the HTTPS connection (CONNECT), so TLS still terminates at Nagad and the proxy cannot read the encrypted request. Signing and encryption remain on your application server.

## Status

`createForwardProxyFetch` is covered by unit tests. It has **not** been tested against a real proxy and the live gateway.
