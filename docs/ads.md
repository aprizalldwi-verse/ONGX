# Ad integration

Phase 7's UI and session rules are implemented. Live delivery is **pending network
approval and account-specific snippets**. A zone ID alone is not a universal
Monetag SDK integration. In particular, the Telegram rewarded SDK must not be
used as a generic website loader.

Set `NEXT_PUBLIC_ADS_ENABLED=true`, the approved `NEXT_PUBLIC_MT_*` IDs and
`NEXT_PUBLIC_MT_ADAPTER_URL` to your hosted account-specific bridge, then rebuild.
These public values are embedded at build time. Keep them blank/false otherwise.

The bridge defines `window.ongxAds` as the `AdNetworkAdapter` interface in
`apps/web/src/lib/ads-client.ts`:

- `show(format, zoneId)` invokes the approved snippet. Its Promise resolves only
  after the format closes: `completed` for a verified rewarded completion,
  `closed` for a skip, or `unavailable` for no fill/failure. Never report rewarded
  completion based on a timer, script load, or a close button.
- `mount(element, zoneId)` fills a native slot and optionally returns a cleanup
  function. It must keep the outer slot dimensions fixed.

The bridge loads once with `lazyOnload`. Smart/push/vignette are requested at
readiness, popunder after the first pointer gesture. Interstitial requires an
internal **document referrer** and scrolling more than one viewport on watch;
client-only navigation with an external/empty document referrer does not qualify.
The adapter owns the network overlay and its close callback. Player pause/mute
are restored after that callback. No ads are injected into player iframes.

Rewarded unlock lasts 30 minutes in sessionStorage. This is a device-local UI
preference, not server-enforced authorization. Native HLS has no quality selector;
the quality gate applies to HLS.js mixed-quality manifests.

Before declaring live delivery complete, verify each approved format, native
fill, no-fill, skip/reject, reward completion, expiration, player restoration,
navigation deduplication, mobile sticky placement, and seller records in
`/ads.txt`. Automated disabled-mode tests cannot establish live network fill.
