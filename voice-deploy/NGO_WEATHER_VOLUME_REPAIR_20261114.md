# NGỐ — weather tomorrow + Marin volume stability
Date 14 November 2026. Official Worker nmh-voice-gpt-test only. Never modify any separate application.

## Confirmed defects in checked source
- `get_weather` requested ONLY current weather variables from Open-Meteo. It could not answer tomorrow's forecast because the required forecast was not retrieved.
- The Marin AudioContext pipeline applied hardcoded user gain 1.55 (max 2.5), then a dynamic compressor/limiter. This configuration could pump level between voice chunks, and was not normalized against the source clip's PCM peak/RMS. This is a plausible software mechanism, not a measured iPhone root cause.

## Implemented fixes
- Weather tool requests Open-Meteo daily forecast for 7 days with forecast date, max/min temperatures, rain mm and max precipitation probability %, wind and WMO code; current preserved. Each value includes date and unit and timezone. If daily fields missing, return a tool failure instead of claiming an invented tomorrow value.
- Marin uses one fixed linear GainNode per decoded chunk, gain calculated from decoded audio's RMS and exact peak scan, with 0.88 peak safety ceiling; the dynamic compressor that caused possible pumping is removed. User volume adjustment remains available. Mic, TTS provider, speech speed and cancellation unchanged.

## Acceptance requirements
- Unit tests: simulated tomorrow forecast differs explicitly from current; Open-Meteo URL includes daily vars; missing daily fails closed. Audio quiet and loud chunks yield close normalized output, a narrow PCM spike does not clip, silence is safe, full HTML uses no DynamicsCompressor.
- Full legacy and new CI PASS; Cloudflare real isolated D1/Worker sandbox and exact rollback PASS; production version pin, D1 bookmark and post-release smoke PASS.
- On real iPhone, verify repeated sentence, long response multiple Marin chunks, normal and adjusted volume levels, and tomorrow forecast for user-selected city (checking reported date, units and source). No live user iPhone evidence yet.

## External primary API documentation
- https://open-meteo.com/en/docs confirms daily temperature_2m_max/min, precipitation_probability_max, precipitation_sum and forecast_days.

Status: source fix and tests prepared; sandbox/deployment evidence appended only after verified runs.
## VERIFIED EXECUTION — 14/11/2026
- Root cause confirmed: `get_weather` previously requested only `current`; fixed to request seven-day `daily` weather data. Public Open-Meteo docs: https://open-meteo.com/en/docs
- Real public source via Guard/Operator GET geocoding `Hà Nội`: HTTP 200, top result PPLC Hanoi at 21.0245,105.84117. Real forecast API GET near Hanoi: HTTP 200, `daily.time` includes `2026-11-15`, `temperature_2m_max/min` and `precipitation_probability_max`. This proves external forecast provider returns tomorrow data; it does **not** prove OpenAI Responses model chooses the tool on a real iPhone session.
- Audio design: sample entire decoded PCM for peak, sample RMS for target loudness, linear gain clamp and peak ceiling 0.88; no dynamic compressor. Unit waveforms quiet/loud/transient/silence tested. Requires real iPhone headset/speaker UAT for subjective stability.
- CI unit+legacy **110/110 PASS** (74 core + 36 reminders/theme/volume/latency): https://github.com/hvnm1206/TikTak-Service/actions/runs/43601366567
- Isolated real Cloudflare D1/Worker, rollback and cleanup PASS after adding bounded strict Cloudflare deployment verification: https://github.com/hvnm1206/TikTak-Service/actions/runs/43601510075 . First sandbox https://github.com/hvnm1206/TikTak-Service/actions/runs/43601366501 failed only immediate rollback-version assertion; API had not converged, resources cleaned. No bypass; second attempt verified exact target version.
- Production guarded release SUCCESS https://github.com/hvnm1206/TikTak-Service/actions/runs/43601602098 . New official Worker version `c53ec4d6-ed9f-4dd2-9f79-76cdfdd8505d`, immediate rollback code version `c547c24a-ff0a-4b6d-afe4-1bbdd80d23d9`. Same URL, D1 Time Travel bookmark in release artifact. No unrelated app changes.
- Do not represent 110 tests as real device audio evidence. iPhone UAT to check forecast tomorrow, voice sound and slider remain pending.