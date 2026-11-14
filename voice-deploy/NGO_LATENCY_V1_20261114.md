# NGỐ: Voice to first audio latency, 14/11/2026

## Verified current pipeline
Safari SpeechRecognition final -> ask -> D1 Memory context -> OpenAI GPT Responses (optional search/tools) -> FULL response -> Marin first TTS -> MP3 decode -> AudioContext first sound. Existing implementation prefetches next TTS chunk only after first chunk starts playing.
The user's complaint is real; actual iPhone timing measurements are not yet available. Do not fabricate milliseconds or a speedup.

## Implementation
- New latency-ui.js introduces per-turn timestamps at recognition end, chat start/finish, first TTS request/ready and first AudioContext playback. SETUP reports GPT/API, Marin-to-first-audio, end-to-end and backend D1/GPT times. No text, API key, user ID or recording is stored as diagnostic.
- Worker /api/chat response includes non-sensitive timing object: memoryMs, agentMs, serverMs. Existing answer, tools, error contracts are preserved.
- Long initial utterance first Marin chunk now <=180 chars; later pieces <=440 chars as before. Original text/order preserved; subsequent audio prefetch and interruption/cancel unchanged.
- GPT still generates full response before Marin starts. Full GPT-to-TTS overlapped streaming is a separate architectural change and is NOT being claimed.

## Acceptance gates
1. Regression legacy 72 tests plus theme/reminder/latency tests and D1 action timing assertions.
2. Cloudflare isolated Worker and remote D1 sandbox, owner authorization, readback, feature smoke, exact rollback, cleanup.
3. Same-URL Worker production release only after CI/sandbox with version pin, Time Travel bookmark and rollback.
4. Read-only independent Operator GET health and page presence.
5. Real iPhone UAT still required: speak, look at SETUP latency metrics after turn, compare repeated normal/search cases, verify mic/Marin, interruption, visual themes and reminders.

Interpretation: only timing measurements from physical iPhone can support a quantitative speed improvement claim; no paid API was added.
## Verified execution result
- CI: https://github.com/hvnm1206/TikTak-Service/actions/runs/43599883353, 72 core + 32 reminder/theme/latency = **104 PASS**. Includes D1 Memory success path and timing metadata, source-script compile, existing Marin prefetch/interrupt, and 180/440-char text preservation.
- Cloudflare isolated Worker+remote D1, migrations, claims, exact rollback and cleanup: https://github.com/hvnm1206/TikTak-Service/actions/runs/43599883356 **SUCCESS**.
- Guarded production GitHub Actions: https://github.com/hvnm1206/TikTak-Service/actions/runs/43599996114 **SUCCESS**; current Worker version `c547c24a-ff0a-4b6d-afe4-1bbdd80d23d9`, previous rollback `f24ae459-324a-4aef-96d0-7713454d62e4`. D1 Time Travel bookmark artifact preserved in release workflow.
- New timing labels available in SETUP after speaking. Note: `GPT/API` includes browser→Worker network and request processing; `GPT server` includes Responses API plus any tool calls; `Marin → tiếng đầu` includes request, decoding and starting AudioContext.
- No verified physical-iPhone timings yet. Actual reduction in seconds must be determined from 3-5 recorded turns across simple and search-required questions, not estimates.
