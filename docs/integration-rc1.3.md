# Local integration build 1.5.0-codex.rc1.3

This build integrates the plugin-only optimization branches of work: named-agent delivery, mention roster isolation, account/room request generations, roster-read timeout, hidden-tab SSE guards, cancellation and late-result filtering, account controls and permissions, and phone/foldable container layouts.

## Compatibility and deployment

- Harness remains pinned to `0.1.2-rc.1`; dependencies are unchanged from local `rc1.2`.
- Install the built plugin package, not the development tree or private review artifacts.
- Back up the installed plugin and profile package metadata before replacing it. Keep the same `DSH_HOME`, credentials and storage; do not migrate or manually edit databases.
- Validate the isolated instance before updating the existing service. Keep a restorable previous package.
- Plugin updates do not configure Cloudflare. Cache only validated public versioned assets, never account, room, message, file or live-event APIs.

## Verification boundaries

The automated suite checks request ownership, independent profile dispatch, cancellation, permissions, timeout recovery and real Chromium layout geometry. Concurrent-delivery tests use a controlled runtime and are not a provider throughput benchmark. Layout coverage includes 320–1440 CSS pixels, short landscape and draft retention during resizing; it does not certify hardware hinges, software keyboards, Safari or every mobile device.

Release/build, installed package identity, runtime health, authenticated operations and browser rendering are separate acceptance layers. A build or health response must not be described as proof that all real-model conversations succeeded.
