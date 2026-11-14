# NGỐ — FULL SOURCE & OPERATIONS AUDIT + COST MODEL
Date: 2026-11-14. Read-only. Not a pass certificate.

## Verified scope / sources
- Official production: https://nmh-voice-gpt-test.magical-budget.workers.dev/
- GitHub source: branch nmh-voice-actions-reminders-p0-20261114; separate documentation branch nmh-voice-gpt-v1.
- Last pinned release: Cloudflare version c53ec4d6-ed9f-4dd2-9f79-76cdfdd8505d, release run https://github.com/hvnm1206/TikTak-Service/actions/runs/43601602098 (success). Exact code rollback prior version c547c24a-ff0a-4b6d-afe4-1bbdd80d23d9. D1 Time Travel bookmark created by production workflow; not a tested actual production restore.
- Independent guarded production GET /health, /api/v3/config, /api/reminders/capabilities all HTTP 200; config ready true and D1; reminders enabled true and foregroundOnly true. GET status is not an end-to-end user experience proof.
- Most recent postrelease CI on source branch https://github.com/hvnm1206/TikTak-Service/actions/runs/43601949719 success. Prior release unit suite 110/110 PASS; isolated Worker D1 rollback https://github.com/hvnm1206/TikTak-Service/actions/runs/43601510075 success.
- No real OpenAI API billing export, Cloudflare account usage export, D1 row counts, physical iPhone sound/latency traces, or multi-account production session run inspected. The cost figures below are modeled scenarios, not actual bills.

## Architecture and assessed findings
1. **Voice**: Safari SpeechRecognition, turn-final triggers /api/chat, full GPT response then first /api/tts, Marin gpt-4o-mini-tts, decoded MP3 AudioContext. Prefetch of next speech segment occurs only after first begins playing. Overall no fully streamed model-to-audio pipeline. Latency UI diagnostic measures per-turn totals but does not aggregate p50/p95.
2. **Marin loudness mismatch — P1**: chat playback uses calculateStableAudioGain(decoded,voiceGain) with RMS plus exact sample peak, whereas reminders-client.js speaks via direct new Audio(objectUrl), bypassing normalized audio path. Hardware perception remains unverified. Synthetic normalization wave tests PASS; doesn't prove equal loudness on iPhone.
**Model lifecycle — P1 watch**: OpenAI currently marks `gpt-4o-mini-tts` Deprecated on its official model page, although endpoint/pricing remain documented. Migration must be assessed and verified before retirement, without silently changing Marin voice.
3. **Weather — partial verification**: get_weather now requests Open-Meteo current plus seven-day daily forecast. Actual public Open-Meteo geocoding and daily endpoint responded HTTP 200 with dates including 2026-11-15. Agent free-language tool selection and accurate location disambiguation have no independent live-model acceptance evidence. First geocoding match may pick a same-name locality, not a verified user location.
4. **Search and voice citations**: GPT-6 Luna Responses supports official web_search with a one-call limit; alternative Wikipedia, Open-Meteo and RSS function tools. Citations are stripped from speech and stored in sources for display. Tool selection and source quality not proved with unseen natural utterances, and some sources (RSS) are partial.
5. **Personal D1**: Google ID token signature verified with JWKS; __Host session cookie HttpOnly, Secure, SameSite Lax. Per-user D1 queries and verified action receipts. Memory retrieval directly loads max 20 latest, tool read_memories permits offset <=500/50 per page; not semantic rank and not arbitrarily complete. Document search uses LIKE token selection. Memory V2 observer off by default, may incur extra Luna call if active and user opts in.
6. **Reminders — P1 product limit, P1 cost scaling**: foregroundOnly enabled, checks /api/reminders/due every 10 seconds while page open, 8,640 requests per continuously open device per day even with zero reminders. 12 devices 24h may exceed Cloudflare Workers Free 100,000 requests/day before voice traffic; 35 devices 8h/day also exceed. No background push notifications guaranteed, Safari may prevent automatic reminder playback.
7. **API key — P1 security/operating risk**: user-supplied OpenAI key stored in iPhone localStorage if opted in, posted via same-origin HTTPS /api/chat and /api/tts, forwarded to OpenAI; not intentionally persisted in D1. LocalStorage is script-accessible, unlike HttpOnly cookies; avoid use on shared/untrusted devices. Production Worker is no account-level chat cap or spend cutoff in observed code, so safeguard keys with provider project spend controls.
8. **Costs — P1 accuracy risk**: UI estimates Luna token and web search calls, and gpt-4o-mini-tts time at $0.015/min; stored only in per-device localStorage for ~31 day rows, fixed conversion 25,675 VND/USD. Not an invoice: doesn't aggregate devices/users, excludes model response input tokens for search content where not captured correctly and TTS input text token charges, ignores retries and failed/billed requests, and cannot reconcile to OpenAI platform bills.
9. **Cloudflare**: Workers Free 100,000 requests/day, D1 Free 5m rows read/day, 100k rows written/day, 5GB storage. Workers Paid subscription starts $5/month; actual account plan/usage is not available in read-only evidence. D1 full-table scan can consume far more than rows returned, monitor D1 analytics.
10. **Tests/rollbacks**: CI includes unit and remote sandbox Worker + D1 with exact rollback checks; multiple rollout failures were discovered during previous changes, meaning the gates do work. But no automated live GPT with actual user key, Safari speech/acoustic output or real push reminder UAT. Do not equate 110 unit tests with feature acceptance.

## Indicative operating cost (not actual usage)
Official prices checked 2026-11-14:
- GPT-6 Luna Standard short context: $0.10/1M uncached input tokens; $0.50/1M output tokens; cached input $0.01/1M. https://developers.openai.com/api/docs/pricing
- Official OpenAI web_search: $0.01 per call, PLUS billed search content input tokens. https://developers.openai.com/api/docs/pricing
- gpt-4o-mini-tts estimated $0.015 per minute of synthesized speech (actual audio $12/1M output tokens, text input $0.60/1M). https://developers.openai.com/api/docs/models/gpt-4o-mini-tts
- Cloudflare Workers and D1: https://developers.cloudflare.com/workers/platform/pricing/ and https://developers.cloudflare.com/d1/platform/pricing/
- Example FX reference Nov 14: $1≈25,727 VND, not a card/bank settlement rate.

**Scenario assumptions**: 30 calendar days/month; one *turn* includes 3,000 uncached Luna input + 150 Luna output tokens total across all model rounds, 20 seconds generated speech, 20% of turns invoke exactly one official OpenAI web_search. No retries, no opt-in Memory V2, no caching discount, no taxes/FX fees; free external sources and user-device browser STT. Expected model per turn $0.000375, TTS $0.005000, web (average) $0.002000, combined $0.007375/turn. Search content token overhead is excluded and therefore actual may be higher.

| Voice turns/day | Turns/30d | Luna USD | Marin USD | Web USD | Subtotal USD/30d | Rough VND/30d |
| 20 | 600 | 0.225 | 3.00 | 1.20 | 4.425 | 113,842 |
| 100 | 3,000 | 1.125 | 15.00 | 6.00 | 22.125 | 569,210 |
| 500 | 15,000 | 5.625 | 75.00 | 30.00 | 110.625 | 2,846,049 |

For no web search, subtract $0.002 average/turn; for 40 seconds generated audio, add $0.005/turn. Extra tool rounds can multiply Luna input/output and latency. Free plan remains $0 only while quotas not breached; Paid Workers adds at least $5/month to Cloudflare account, separate from OpenAI API costs. Each user with own BYOK pays their own OpenAI usage; Cloudflare charges are borne by the account hosting Worker.

## Concrete priorities
- **P0 acceptance**: real iPhone repeatable suite including mic, normal turn, search and tomorrow weather, memory save/readback, reminders, multi-segment and reminder volume, interruption, p50/p95 first audio.
- **P1**: unify Marin output chain between chat/reminders; reduce 10-second idle polling (conditional/scheduled) and explicitly label foreground limitation; implement usage counters and per-user spend safeguards; prove source choice and retrieval behavior for unseen phrases.
- **P2**: true GPT-to-TTS streaming after protocol design and cancellation tests; improve geocoding locality disambiguation, memory semantic retrieval and cost analytics reconciliation.
- No production edits were made in this audit; this is evidence and recommended actions only.
