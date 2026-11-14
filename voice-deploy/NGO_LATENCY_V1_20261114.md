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