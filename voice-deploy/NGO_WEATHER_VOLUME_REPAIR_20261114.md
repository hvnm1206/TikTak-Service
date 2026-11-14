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