# NGỐ / NMH VOICE GPT — P0 ActionRegistry / Foreground Reminder / Audit

## 2026-11-14 — PRODUCTION RELEASE VERIFIED (current, supersedes earlier "not deployed" entries)
- **User-authorized production deploy accomplished** at existing https://nmh-voice-gpt-test.magical-budget.workers.dev/ ; Worker `nmh-voice-gpt-test`, Cloudflare version `08e0bbf2-a2e5-4b98-94dc-0cfee882e5b6`.
- Guarded release GitHub Actions https://github.com/hvnm1206/TikTak-Service/actions/runs/43578218605 **SUCCESS**. 71 old + 17 P0 tests PASS; isolated pilot preflight PASS; original Worker version and D1 Time Travel bookmark backed up to 30-day artifact; additive production D1 migration `0004_reminders.sql` PASS; same Worker deployed, post-deploy voice/Marin/V3/OAuth UI/unauth/API error smoke PASS.
- Exact rollback Worker version `fb2bacc5-b26e-4abc-9ee1-78cc222ac221`. D1 Time Travel bookmark is archived as artifact `ngo-p0-prod-version-and-d1-bookmark` under the release workflow; Worker code rollback does NOT roll back D1 (migration is additive and preserved).
- `NMH_REMINDERS_MODE=active` and `NMH_MEMORY_V2_MODE=active` on production; no existing Google/V3 tables altered.
- Independent Guarded Operator production GET verification PASS (three 200s): `/health` confirms `browser-stt+marin-tts`, `voice-write-synchronous-ack-v1`; `/api/v3/config` reports ready D1 and valid Google Web Client; `/api/reminders/capabilities` reports `enabled:true`, `foregroundOnly:true`.
- **Physical iPhone UAT remains pending**: real Google session, user's OpenAI key, GPT tool invocation, Marin reminder playback exactly after two minutes while app visible, multi-tab behavior. User explicitly opted to test on main URL. Never claim iPhone PASS from HTTP.
- Ngáo not touched. Existing production URL preserved. Historical content below describes state before this deployment, not current state.


## 2026-11-14 — Persistent pilot for physical iPhone UAT
- Pilot URL: https://nmh-ngo-p0-pilot-20261114.magical-budget.workers.dev/ (separate Worker + separate D1; NMH_REMINDERS_MODE=active; Memory V2 OFF in pilot only).
- CI deploy: https://github.com/hvnm1206/TikTak-Service/actions/runs/43577570928 — all 4 gates SUCCESS (71+17 unit/regression, strict baseline check, isolated remote D1 migration & Worker deploy, anonymous 401, app/UI, production intact).
- Independent Guarded Operator HTTP GET /health: Guard PASS; HTTP 200 READY.
- GitHub source commit provisioning workflow: 5e341133d2eb57e8daf2eb2663fe2d82a9771760.
- Pilot stays available for iPhone UAT; it is NOT the production Worker. The pilot does NOT use production V3 user data, so log in and set up on pilot independently.
- UAT steps: on iPhone open pilot URL, sign in with Google in V3 setup, input own OpenAI API key, check mic/Marin/search, say exactly “2 phút nữa nhắc tao uống thuốc”; verify D1-backed acknowledgement, 2-minute visible toast and playback, then test list/cancel, refresh and duplicate tabs; app must stay foreground. Record actual iPhone evidence before any production promotion.
- NOT VERIFIED: real end-to-end OpenAI function call + Google user and physical iPhone foreground/Marin; production migration/deploy not done. Never claim completed production.

Date: 2026-11-14 (Asia/Ho_Chi_Minh)
Branch: nmh-voice-actions-reminders-p0-20261114
Base source: nmh-voice-memory-v2-stage-20261114, commit 1ecd0fea29f6faa5a4b2891b28f826b3c2739755

## Final automatic gates — verified 2026-11-14
- Full existing regression: 71/71 PASS; new tests: 17/17 PASS (including atomic duplicate creation across concurrent tabs), run https://github.com/hvnm1206/TikTak-Service/actions/runs/43577061612
- Live isolated Cloudflare Worker plus real remote D1, insert/claim/readback, exact Worker version rollback and resource cleanup: SUCCESS, run https://github.com/hvnm1206/TikTak-Service/actions/runs/43577061663
- Prod Worker version checked and unchanged: fb2bacc5-b26e-4abc-9ee1-78cc222ac221; D1 production untouched.
- Documentation branch nmh-voice-gpt-v1 updated: MAINTENANCE.md and voice-deploy/START_HERE_NEXT_CHAT.md. That branch is never the release source.
- Automated/backend/sandbox gates: PASS. Release/iPhone foreground speech and real Google+OpenAI subject gates: NOT VERIFIED. Production release remains blocked; no inaccurate DONE claim.

## Scope & safeguard
- Ngố only. Ngáo is absolutely read-only: no code, deployment, data or configuration touched.
- Production Worker: nmh-voice-gpt-test, URL https://nmh-voice-gpt-test.magical-budget.workers.dev/
- Cloudflare account 769c2ab4af5ad50700039d473a72d48e; production D1 UUID 3ce295cb-a84d-4a50-abee-d14fdd903514.
- Verified active production Worker version on 2026-11-14: fb2bacc5-b26e-4abc-9ee1-78cc222ac221.
- Branch changes are isolated. Production code, D1 tables and feature flag unchanged pending release gate.
- Source branch nmh-voice-gpt-v1 is **documentation only** and must not be used to deploy.
- Only new modules wired behind NMH_REMINDERS_MODE=active; absent/default OFF.
- No changes to SpeechRecognition, microphone lifecycle, Marin main voice player, Web Search, Google OAuth, Memory V2, documents, notes or existing V3 tables.

## Implemented in isolated branch
- action-registry.js: exact current-turn action evidence, authoritative owner-scoped backend validation and reply receipt, no LLM-generated write-success ACK.
- reminders.js: GPT function schemas for set/list/cancel; validation of fixed +07 timezone and 2-minute relative delay, owner-scoped idempotent D1 write+readback, cancel+readback, pending list, atomic due claim, non-success on audit/auth/DB errors.
- reminders-client.js: foreground polling and visible toast; single D1 claim across tabs; Marin TTS via existing /api/tts when a locally saved key is present, manual retry when iOS blocks autoplay. No background Push promises.
- migrations/0004_reminders.sql: additive reminder and action-audit tables with trace ID, pseudonymous owner ref, explicit phase/ACK, no transcript or medical note content in logs. Audit pruned after 30 days on subsequent action.
- worker.js/agent-v2.js: narrow new import, guarded API endpoints, feature-gated tool-call and backend receipt. Default OFF behavior preserved.
- tests: SQLite-native, existing Voice/V3/Memory regression, current-turn hijack protection, invalid time, dedupe, cross-owner, cancel ambiguity, multi-tab atomic claim and frontend script parse.

## Evidence (initial run)
- CI + read-only Cloudflare baseline: https://github.com/hvnm1206/TikTak-Service/actions/runs/43575735755 (PASS, 71 legacy tests + 11 new SQLite tests).
- Baseline snapshot: GitHub Actions artifact "ngo-p0-prod-readonly-baseline" in run 43575735755. Contains production version and D1 Time Travel bookmark.
- First REAL Cloudflare sandbox Worker+D1 run: https://github.com/hvnm1206/TikTak-Service/actions/runs/43575985351 — sandbox deployment, D1 migrations, synthetic cookie auth, due query, atomic claim, readback, UI smoke, cleanup all PASS. Production unchanged.
- REAL Cloudflare sandbox after trace/audit/schema changes: https://github.com/hvnm1206/TikTak-Service/actions/runs/43576360766 — complete SUCCESS, remote D1 insert/claim/readback/cleanup PASS.
- Exact sandbox rollback test: https://github.com/hvnm1206/TikTak-Service/actions/runs/43576714181 — SUCCESS; deployed a second sandbox version and restored the precise prior Cloudflare Worker version, then deleted Worker and D1. Latest code additionally includes atomic write dedup across two concurrent tabs.

- CI after concurrent dedup change: https://github.com/hvnm1206/TikTak-Service/actions/runs/43577021799 — SUCCESS. This report commit triggers a final real D1/Worker sandbox run on the latest changes; inspect its result before claiming integrated PASS.

## Critical release gate: NOT YET MET
- Live Responses API using user's OpenAI key, actual speech -> tool -> real D1 readback on the user's Google subject: NOT VERIFIED.
- 2-minute actual foreground iPhone notification, Marin playback, Safari autoplay block / manual playback, refresh and multi-tab on physical iPhone: NOT VERIFIED.
- Production schema migration 0004: NOT APPLIED; production feature flag remains OFF/absent.
- Production release: NOT PERFORMED. Do not claim final DONE or iPhone PASS from CI.
- Release must lock actual Worker version, D1 Time Travel bookmark, staging green, backup/rollback and regression; preserve existing URL, data and audio lifecycle.

## Non-guarantees
- Only when application tab is open and allowed to poll; browser may suspend inactive tabs and autoplay.
- Atomic claim guarantees at most one successful server-side claimant. It does NOT guarantee audible playback after a crash between claim and rendering.
- No Web Push when app closed, no locked-screen reminder, no medication safety guarantee.

## Further release safety checks
- Worker audit/action flow bypasses Memory V2 observer on tool-action turns; no medication content is analyzed for long-term memory.
- Sandbox rollback trial uses a second version and returns to the exact previous sandbox Worker version; it must PASS before production promotion.

## Sandbox rollback verification retry
- Attempt https://github.com/hvnm1206/TikTak-Service/actions/runs/43576520560: sandbox deploy encountered Cloudflare eventual-consistency HTTP 10007 when registering workers.dev subdomain. D1 created/migrated successfully; automatic cleanup of Worker and D1 and production version check PASSED. No production mutation. The sandbox workflow now retries the isolated deploy; this commit reruns exact rollback verification.
