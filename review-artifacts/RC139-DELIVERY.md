# rc1.39 candidate delivery boundary

Version: `1.5.0-codex.rc1.39`. Source is frozen and full CI passed typecheck/build, 53 unit files / 462 tests, and 15 browser files / 77 tests (`RC139-check-ci.log`). This record does not claim package, immutable staging, deployment, health, public, IAB, or reconnect acceptance.

## Work in progress

- Runtime diagnostics and all candidate work below are covered by the passed full CI. That does not replace a live diagnostics receipt.
- Room work adds per-request cumulative stage timing for investigation and attribution. It does not close the timeout cause.
- The QQ2007 composer replaces a fixed four-column grid that did not match the actual right/model/context/interrupt/send controls with flexible layout and per-button model ellipsis, so controls do not overlap. A category-width rule no longer combines `width: 100%` with horizontal margins; it now uses auto width, border-box sizing, and a gutter to prevent the observed 8px horizontal overflow. Focused visual evidence is 17/17 plus `tsc`; package and live evidence remain pending.
- The blank-bootstrap cause remains under investigation. The candidate must not claim that its root cause, the public super-admin selection timeout, or the IAB `RangeError` re-entry is fixed.

## Retained rc1.38 boundary

rc1.38 has passed CI, served/health, isolated guest, and public-member layers, but its public super-admin deep-link selection timed out at 30 seconds. Its original IAB receipt retained blank bootstrap and client-store/AgentPreset `RangeError` re-entry. A later manual selection restored the room and preserved the draft; that capture also showed 720px AI and Group dialogs without overflow, but it is layout-only proof rather than deep-link recovery. It observed composer model/send overlap, which rc1.39 now targets. These remain failed version-scoped receipts and are not promoted by rc1.39 candidate work.
