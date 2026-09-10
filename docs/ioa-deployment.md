# IOA / dsh-auth deployment notes

Candidate account controls are documented in both READMEs. Chatroom sign-out revokes the local browser token, not an upstream IOA/OIDC session; an identity provider may sign the same person in again. Platform `super-admin`, the settings allowlist, and per-room owner/admin membership are separate grants. The legacy platform `admin` role does not imply any of these grants. Non-managers receive redacted AI configuration in both snapshots and live events. These changes require installing the candidate plugin; they do not alter Harness core or migrate the database schema.

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

This local `1.5.0-codex.rc1.3` build is pinned to Harness `0.1.2-rc.1`; it is not an upstream release. The Chatroom bundle disables the profile's original `connection` entry and mounts account-authorized `/api` HTTP routes and `/api/remote.mux`. The official Gateway remains active with an isolated `webServer`, preserving its protocol and client module without an unguarded WebSocket listener. Do not re-enable a second native transport or install older Harness peers alongside this build. Other Harness cohorts require a fresh compatibility check.

Room AI participant profiles are plugin-owned extension data. They are stored in the dedicated `chatroom_agents` storage domain/file, not as a new table in the legacy `chatroom` domain and not in a Harness core domain. Normal native Session creation/continuation still uses the official Session APIs. Do not merge `chatroom_agents` into `chatroom`, manually edit either JSON file, or copy credentials into profile records. Runtime failure details remain in Host logs; browser-visible member status intentionally uses bounded generic messages.

For a shared LAN installation, use a dedicated `DSH_HOME` and workspace rather than exposing a private profile's Sessions, MCP credentials, and unrelated plugin APIs. Each person signs in with a distinct account; the group owner adds existing accounts from Group management. A trusted-LAN HTTP endpoint does not encrypt passwords or messages. Use a TLS reverse proxy and an HTTPS `authPublicOrigin` for untrusted networks or Internet access.

An edge `forward_auth` check establishes login, not room membership. Chatroom verifies the account and Session ownership on HTTP requests and outgoing WebSocket frames, including expiry and disabled-account revocation. The edge should still protect private static assets and other plugins' endpoints. Keep the Host bound to loopback behind the authenticated TLS proxy.

Set `authPublicOrigin` to the public origin. `nativeTrustedHosts` inherits the Web profile's trusted hosts through the bundle; extend it only for explicit additional deployment hostnames. Native request bodies are limited by `nativeMaxRequestBytes` (314572800 by default), separately from Chatroom upload limits. Forward `Host`, `Origin`, cookies, and WebSocket upgrade headers without accepting client-supplied identity headers as verified identity.
