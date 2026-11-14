# Ngố — Reminder 10-minute polling (14/11/2026)

## Decision and scope
User offered removal or extension to 10 minutes. Chosen least destructive 10-minute foreground polling. Existing pending reminders, D1, OAuth, Marin, GPT tools, voice and Ngáo unaffected.

## Implementation
- Old: check /api/reminders/due every 10000ms, up to 8,640 GETs per 24h continuously open device.
- New: check every 600000ms, up to 144 scheduled GETs per 24h continuously open device (60x fewer).
- On initial page load check promptly after 500ms; on re-entering visible/focus check only when last check >=60000ms ago and no request already in flight.
- Atomic reminder claim still prevents duplicate notifications; pending reminders remain in D1.
- Compromise: reminders may be delayed by up to ~10 minutes while page stays open; foreground-only limitation unchanged. This is NOT reliable punctual delivery.

## Cost correction
OpenAI gpt-4o-mini-tts official pricing is billed by text input tokens ($0.60/1M) and generated audio output tokens ($12/1M). Its public estimate is ~$0.015 per synthesized audio minute, NOT a mandatory one-minute minimum. 20 seconds output was estimated ~$0.005; use this solely as planning estimate, not measured invoice. Chat GPT-6 Luna at $0.10/1M input and $0.50/1M output is comparatively cheap in the model assumptions. TTS cost scales with spoken output duration (not listening time), repeated synthesis and unnecessary verbosity. Source: https://developers.openai.com/api/docs/models/gpt-4o-mini-tts

## Required release
Verify unit/legacy, Cloudflare remote D1 sandbox rollback, version-pin release, independent HTTP and current version. Test with live iPhone still required. Production must not be changed without gate evidence.
