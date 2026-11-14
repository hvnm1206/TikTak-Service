# NGỐ / NMH VOICE GPT — P0 ActionRegistry / Foreground Reminder / Audit
Date: 2026-11-14 (Asia/Ho_Chi_Minh)
Branch: nmh-voice-actions-reminders-p0-20261114
Base source: nmh-voice-memory-v2-stage-20261114, commit 1ecd0fea29f6faa5a4b2891b28f826b3c2739755

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
- This report commit requests a NEW sandbox run after latest trace/audit/schema changes; the new run must be checked independently. Do not substitute old sandbox evidence for changed code.

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
