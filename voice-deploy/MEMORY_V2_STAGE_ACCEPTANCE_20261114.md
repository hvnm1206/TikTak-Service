# NMH Voice GPT — Memory V2 staging acceptance & release gate
Date: 2026-11-14

## Scope lock
- Only repository hvnm1206/TikTak-Service, staging branch nmh-voice-memory-v2-stage-20261114 and Cloudflare sandbox nmh-memory-v2-sandbox-20261114.
- Ngáo reference ZIP is strictly read-only; no Ngáo files, infrastructure, tokens or services changed.
- **Production NMH Voice** remains `nmh-voice-gpt-test`, https://nmh-voice-gpt-test.magical-budget.workers.dev/, Cloudflare version `51bd4dde-0d73-455c-b1ed-6bac8965de66`. No Memory V2 deployment to it.
- Production D1 database ID `3ce295cb-a84d-4a50-abee-d14fdd903514`: **never targeted for schema changes or writes** in this implementation round.

## Delivered on isolated staging branch
- `voice-deploy/memory-v2.js`: GPT structured-output proposal engine, conservative evidence-based validation, owner-scoped D1 atomic batch and read-after-write verification. No function tool in ordinary voice flow.
- Modes `off` (default), `shadow` (no D1 memory writes), `active` (requires explicit account opt-in).
- Separate D1 migration `0003_memory_v2.sql` for idempotency ledger and per-user revision-guarded consent. Existing six V3 tables are unchanged.
- `v3-backend.js`: read-only verified Google session identity and opt-in endpoint `/api/v3/memory-v2-preference`.
- `worker.js`: post-response `waitUntil` observer; errors isolated, existing answer and STT, GPT, web search, Marin TTS unaffected. Rechecks consent AFTER analysis before any active write.
- `v3-ui.js`: hidden-until-available opt-in switch in existing SETUP; no changes to mic controls.
- All code and tests live ONLY on staging branch. The sandbox's OAuth origin has not been verified for real iPhone login.

## Verified evidence
1. Unit regression, OAuth owner rules, shadow and user revocation: [GitHub Actions 43564309702](https://github.com/hvnm1206/TikTak-Service/actions/runs/43564309702): 46/46 existing Voice/V3 PASS + 16/16 Memory V2 PASS; SQLite migration PASS. Includes 50 unrelated turns, foreign account protection, ambiguous delete rejection, deduplication, OFF/no analysis, SHADOW/no writes, Setup script compilation and consent switched off mid-analysis.
2. Real Cloudflare sandbox D1 schema & Worker HTTP: [Actions 43564381995](https://github.com/hvnm1206/TikTak-Service/actions/runs/43564381995) SUCCESS: sandbox 8 tables, `/health`, V3 config, unauthenticated access blocked, code deployed to **sandbox-only version `eab90ecb-b77d-4887-8f9d-3d7a072be0d8`**.
3. Synthetic authenticated sessions via sandbox Worker + real D1: [Actions 43562769522](https://github.com/hvnm1206/TikTak-Service/actions/runs/43562769522) PASS owner isolation, user opt-in readback, stale revision blocked, opt-out, no memory written in Shadow and synthetic cleanup.
4. Actual native D1 binding `db.batch` from disposable secured probe Worker with MOCK structured GPT response: [Actions 43564162174](https://github.com/hvnm1206/TikTak-Service/actions/runs/43564162174) PASS add/read/delete/update, idempotency, tenant isolation and SHADOW no-write; test users and disposable probe Worker deleted.
5. Production read-only baseline [Actions 43564018510](https://github.com/hvnm1206/TikTak-Service/actions/runs/43564018510) PASS: unchanged version `51bd4dde-0d73-455c-b1ed-6bac8965de66`, current aggregate counts (at audit instant): 1 user, 6 sessions, 1 memory, 1 document. No personal contents read.

## NOT ACCEPTED / release block
- No authenticated end-to-end test on user's real iPhone microphone → recognized text → actual user-provided OpenAI API key → real GPT structured proposal → D1 write → reload → correct recall, and Marin voice output.
- No verified model semantics/actual Responses API invocation using user's device-supplied API key. Tests use a faithful mock GPT output shape; native database writes are real, but not proof of OpenAI model classification in the field.
- No iPhone/UI side-by-side release regression. Browser synthetic/script tests cannot substitute for real iOS speech and audio.

## Non-negotiable promotion gates
- Real iPhone E2E and failed-write diagnostics verified with an authorized user and their own API key. Do not solicit or copy the key into CI/logs.
- Before any production schema deployment: verify immutable Cloudflare version, create verified D1 restore point/backup, recheck current production database ID and schema. Never use sandbox ID for production; never drop existing V3 tables.
- Prepare exact-image rollback and feature kill switch OFF; one-user canary, then Shadow before Active.
- Retest microphone, STT, Marin, Web Search citations, Google OAuth, SETUP, file uploads, existing manual memories and maintenance tab on real iPhone.
- No launch claim until the above is demonstrated; production must stay on known-stable baseline while any gate is open.

## Current conclusion
**Staging technical tests passed. Production deployment not authorized by release gates.** Not a statement that Memory V2 is finished for users. Do not claim success on production or conflate Ngáo reference with NMH Voice.
