# IOA / dsh-auth deployment notes

Account controls are documented in both READMEs. Chatroom sign-out revokes the local browser token, not an upstream IOA/OIDC session. In authenticated deployments, only active platform `super-admin` manages settings, members and AI. Legacy `admin`, room owner/admin and settings allowlist entries confer no extra management authority. UI restrictions are backed by RPC/HTTP and approval/command authorization; members retain chat and their personal account. AI configuration is redacted in snapshots and live events. These changes require installing rc1.27; they do not alter Harness core or migrate the database schema. Unauthenticated legacy mode is not a security boundary.

The open-source bundle keeps `authMode: local` and built-in avatars by default. A managed IOA deployment should inject, outside Git, values equivalent to:

```yaml
authEnabled: true
authMode: dsh-auth-only
authPublicOrigin: https://chat.example.com
authDshAuthLoginPath: /auth/login/external
authAllowSelfRegistration: false
authDshAuthVerifyUrl: http://127.0.0.1:3080/auth/verify
authDshAuthSuperAdminSubjects: [alice]
authDshAuthRevalidateSeconds: 60
authDshAuthAvatarUrlTemplate: https://avatars.example.com/{username}.png
authDshAuthAvatarAllowedOrigins: [https://avatars.example.com]
```

Do not commit IOA tokens, cookies, or application secrets. Keep Chatroom's `authSecret` in a separate
0600 deployment secret (not the dsh-auth session secret). `dsh-auth` owns IOA verification and emits
the standard `X-Dsh-Auth-*` identity headers; Chatroom uses the stable subject for account mapping and
ignores the edge `admin` role. Renewal cookies returned by the loopback verifier are forwarded to the browser.

Keep private avatar-service endpoints and approval references in the deployment runbook, not in the open-source configuration. If approval is unavailable, leave the template empty; the UI continues with built-in avatars.

For rollback, clear the avatar template and switch to `authMode: hybrid` or `local`. Existing external account links remain stable; only the authentication edge changes.

## Native transport authorization

### Candidate responsive UI acceptance

The candidate responsive layer is bundled in the plugin client only. It uses container queries and viewport/safe-area CSS, with native-dialog presentation selectors scoped to the active Chatroom settings content. It does not patch Harness files, change authentication or migrate databases. Keep an existing production installation unchanged until the candidate bundle has been checked in a separate Host instance. A standalone layout preview is not proof of deployed Host compatibility, actual foldable hinge handling or software-keyboard behavior. See `../review-artifacts/foldable-layout-20260910.md` for the bounded layout evidence.

This local `1.5.0-codex.rc1.14` build is pinned to Harness `0.1.2-rc.1`; it is not an upstream release. The Chatroom bundle disables the profile's original `connection` entry and mounts account-authorized `/api` HTTP routes and `/api/remote.mux`. The official Gateway remains active with an isolated `webServer`, preserving its protocol and client module without an unguarded WebSocket listener. Do not re-enable a second native transport or install older Harness peers alongside this build. Other Harness cohorts require a fresh compatibility check.

Image generation is opt-in through `DSH_CHATROOM_IMAGE_BASE_URL`, restricted to a loopback OpenCodex `/v1` endpoint. Verify OpenCodex's existing OpenAI upstream before enabling it; the plugin does not reconfigure other routes or copy upstream keys. Generated images use the existing authenticated room-file endpoint. A Windows service account must independently support the native restricted-token sandbox; successful HTTP image generation is not evidence that shell execution works. Never disable the sandbox to hide a service identity failure.

For the pinned Host with `patchReload: live`, a tested alternative to replacing the running package is a versioned, immutable plugin directory and a persistent profile `cordis.patch.yml` overlay. Disable the original `chatroom` entry, then insert one replacement entry with a stable id and its `file:///.../dist/index.js` path, preserving the existing configuration and authorization settings. The native client-module loader resolves the replacement package's `dsh.client` entry too; verify the actual served client asset as well as health. For later releases, first disable the replacement without changing its current path, wait for disposal, then change its path and re-enable it. A direct name change can leave the old client source registered even though the host has restarted; health alone misses this stale-client failure. This changes neither Harness source nor the Windows service identity. The original dependency manifest may remain as the rollback base and is not proof of the active plugin version.

Rollback to the base entry is two-phase: first remove the replacement while keeping the original `chatroom` entry disabled, wait for disposal, then restore the original overlay. Directly restoring an empty overlay can re-enable the base before disposing the replacement and fail with `service "connection" has been registered`. Test forward switching and rollback in a separate instance; never run two transports at once. Persistent configuration has been read back and cold startup passed in the isolated instance, but production service recovery across a future restart remains untested.

Room AI participant profiles are plugin-owned extension data. They are stored in the dedicated `chatroom_agents` storage domain/file, not as a new table in the legacy `chatroom` domain and not in a Harness core domain. Normal native Session creation/continuation still uses the official Session APIs. Do not merge `chatroom_agents` into `chatroom`, manually edit either JSON file, or copy credentials into profile records. Runtime failure details remain in Host logs; browser-visible member status intentionally uses bounded generic messages.

For a shared LAN installation, use a dedicated `DSH_HOME` and workspace rather than exposing a private profile's Sessions, MCP credentials, and unrelated plugin APIs. Each person signs in with a distinct account; the group owner adds existing accounts from Group management. A trusted-LAN HTTP endpoint does not encrypt passwords or messages. Use a TLS reverse proxy and an HTTPS `authPublicOrigin` for untrusted networks or Internet access.

An edge `forward_auth` check establishes login, not room membership. Chatroom verifies the account and Session ownership on HTTP requests and outgoing WebSocket frames, including expiry and disabled-account revocation. The edge should still protect private static assets and other plugins' endpoints. Keep the Host bound to loopback behind the authenticated TLS proxy.

Set `authPublicOrigin` to the public origin. `nativeTrustedHosts` inherits the Web profile's trusted hosts through the bundle; extend it only for explicit additional deployment hostnames. Native request bodies are limited by `nativeMaxRequestBytes` (314572800 by default), separately from Chatroom upload limits. Forward `Host`, `Origin`, cookies, and WebSocket upgrade headers without accepting client-supplied identity headers as verified identity.

### rc1.21 session media

Gallery metadata comes from the authorized native main/branch Session, paginated in groups of 100. Thumbnails are independent WebP files under the data root `thumbnails/v1`; they are derivative caches, not replacements for originals. The thumbnail cache bounds pending transforms, active Sharp jobs, and in-memory bytes. Both thumbnail and original endpoints recheck authentication on every request. Browser originals use abortable GETs/object URLs, thumbnails use proximity/visibility loading, and collapsed file cards hide raw transport markers. Rectangle selection is normalized against the displayed image and converted on the server into a same-size transparent PNG mask sent with the original to the existing loopback OpenCodex `/images/edits` endpoint. GPT/M3 use the same plugin edit tool; no DSH source, sandbox policy or upstream API key is changed.

Set `miniMaxCodePath` to the installed official CN `mcode-tools.cmd` launcher (bundle environment: `DSH_CHATROOM_MINIMAX_CODE_PATH`). The Windows runtime identity must be able to use the existing MiniMax Code host-managed authentication broker. Never copy its named-pipe capability file or extract its token. The API rejects non-admin callers; the UI requires explicit model and credit confirmation before a new paid submission. Hailuo 2.3 subscription eligibility and H3/H3 Max credits are different entitlements. Official sources: https://github.com/MiniMax-AI/MiniMax-Code-Plugins , https://github.com/MiniMax-AI/cli , https://platform.minimaxi.com/subscribe/token-plan . The native connector schema on the installed client is the execution contract; public REST API credentials are not silently substituted.

Video admission and provider task IDs persist under `video-jobs`; an uncertain submission is never automatically replayed. Existing official task IDs can be imported with their original model without generation. A visible open dialog queries the same tasks serially; closing/hidden/unmount aborts reads, subprocess trees and pending result downloads, but does not cancel admitted provider jobs. Completed videos are bounded to 100 MiB and verified as MP4 before storing through the existing attachment archive. Only HTTPS output URLs on the verified OSS domain are accepted, with no redirects. Playback is click-to-load with Range support; close releases the video source. Source images are uploaded to MiniMax only following explicit image-to-video submission. Do not describe a local mock or an imported successful task as a newly generated paid video.

Current acceptance artifacts are in `review-artifacts/GALLERY-MEDIA-20260911*`. Code/build tests, deployed browser checks, actual image edits, and existing-video retrieval are recorded separately. A hidden-window optimization is not a guarantee that provider-side work stops, and controlled hot reload is not evidence of indefinite WAN endurance.
