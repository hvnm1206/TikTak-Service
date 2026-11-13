# NMH VOICE GPT V2 — TRIỂN KHAI THAM CHIẾU NGÁO
Ngày: 13/11/2026 · Trạng thái: SOURCE + CI VERIFIED; NOT DEPLOYED TO CLOUDFLARE

## Nguồn và giới hạn
- Repo `hvnm1206/TikTak-Service`; nhánh duy nhất thay đổi: `nmh-voice-gpt-v1`.
- Cơ sở tham khảo: gói `ngao-ban-giao(1).zip`, `ngao/netlify/functions/turn.mts`, `ngao/src/voice/tools.ts`, `ngao/netlify/lib/gtts.mts`.
- Ngáo đang hoạt động trên Netlify; **không chuyển NMH Voice sang Netlify**, không đụng dự án Ngáo.
- Worker production Cloudflare Magical Budget giữ nguyên: `https://nmh-voice-gpt-test.magical-budget.workers.dev`.
- Source production V3 trước nâng cấp: commit `04ca132e0df80ded80fcd0735fb05fe224209ce8`.
- Account ID được chủ tài khoản cung cấp: `769c2ab4af5ad50700039d473a72d48e`.

## Sáu bước — bằng chứng thực tế
1. Đối chiếu source Ngáo + source NMH, xác định mốc Git V3: PASS phần đọc nguồn; rollback Cloudflare **chưa thử**.
2. Lớp GPT mới: `voice-deploy/agent-v2.js` sử dụng `gpt-6-luna`, Responses API, reasoning none, giữ 16 lượt, tối đa 3 vòng công cụ: source và CI mock PASS; API thật **chưa gọi**.
3. Tự gọi công cụ, không hard-code câu hỏi, không nút tra mạng: `get_current_time`, `get_weather` (Open-Meteo), `search_encyclopedia` (Wikipedia), `search_news` (Google News RSS). Operator HTTP GET đã xác minh các nguồn công khai trả 200; CI mock PASS. Đây KHÔNG phải toàn bộ Internet, nguồn RSS có thể thay đổi và Open-Meteo điều kiện sử dụng phi thương mại cần kiểm tra theo mục đích dùng.
4. Phong cách: 3 nút ĐANH ĐÁ, CHÉM GIÓ, NGHIÊM TÚC; persona tùy phong cách, không phân loại câu hỏi bằng từ khóa. Voice: Safari SpeechRecognition vẫn là STT; TTS mới gọi OpenAI `gpt-4o-mini-tts` giọng `marin`, tăng playbackRate tới 1.455 cho 2 phong cách giọng trẻ, đọc theo từng câu, thất bại thì fallback Safari. **Không phải cùng Google Chirp3-HD Leda chính thức của Ngáo; độ giống giọng chưa nghiệm thu.**
5. CI test thật: GitHub Actions `43418450493` SUCCESS, 14/14 PASS, 0 FAIL, deploy SKIPPED: https://github.com/hvnm1206/TikTak-Service/actions/runs/43418450493. Test sử dụng OpenAI và dịch vụ bên ngoài giả lập, không được gọi là live API PASS. Khi có thời gian có thể chạy lại: `node --test voice-deploy/agent-v2.test.mjs voice-deploy/worker-v2.test.mjs` (Node 22).
6. Production: **CHƯA triển khai**. Workflow đã tách verify khi push và deploy chỉ khi workflow_dispatch, input deploy_live=true; không có fallback --temporary. Thiếu xác minh secret Cloudflare, quyền API, rollback Worker và test iPhone.

## Cấu trúc
- `voice-deploy/worker.js`: trang HTML, SpeechRecognition, TTS, route GET /, /health, /api/docs/*, POST /api/test, /api/chat, /api/tts.
- `voice-deploy/agent-v2.js`: Responses agent + model tools.
- `voice-deploy/agent-v2.test.mjs`: 8 ca test agent.
- `voice-deploy/worker-v2.test.mjs`: 6 ca test Worker/Voice.
- `.github/workflows/nmh-voice-preview.yml`: CI verify, deploy thủ công có kiểm soát.
- `voice-deploy/wrangler.jsonc`: name `nmh-voice-gpt-test`, Worker cố định.

## Chi phí & hạn chế
- OpenAI `gpt-6-luna`: $0.10 / 1M input tokens, $0.50 / 1M output tokens (giá tài liệu chính thức tại ngày kiểm tra). Backend trả usage + ước tính chỉ chi phí model, chưa gồm giọng.
- OpenAI `gpt-4o-mini-tts` có phí audio: $12 / 1M output audio tokens, $0.60 / 1M input text tokens. **Chưa đo chi phí mỗi lượt thực**, không thể khẳng định đạt 50–150 đồng/lượt.
- OpenAI TTS Speech API có kế hoạch ngừng phiên bản gpt-4o-mini-tts ngày 06/01/2027; phải xem kế hoạch migration trước khi vận hành dài hạn.
- Tra cứu public tools không tính phí search API riêng, nhưng không bao phủ toàn Internet, không bảo đảm chính xác mọi tin mới.
- Chất giọng trẻ trên iPhone cần kiểm chứng tai thực; thiếu khóa Google Chirp3-HD Leda trong Cloudflare nên chưa thể tái hiện đúng nguồn giọng chính của Ngáo.

## Gate triển khai
1. Account ID đã chốt trực tiếp trong GitHub Actions là `769c2ab4af5ad50700039d473a72d48e`; **chỉ còn GitHub Secret `NMH_CF_API_TOKEN` thiếu**, được kiểm chứng tại run `43419105881` ngày 13/11/2026 (`CLOUDFLARE_API_TOKEN=NOT_CONFIGURED`). Token phải có quyền Workers Scripts Edit và được lưu qua kênh bí mật; không gửi token trong chat.
2. Backup Cloudflare Worker production, xác minh có thể rollback sang version đang chạy.
3. Test trực tiếp OpenAI key của người dùng và Speech/TTS trên iPhone ở môi trường an toàn; đo token, TTS audio và kết quả tra cứu.
4. Phát hành production đúng URL cố định, ghi full deployment/commit/run, thử hồi quy, nếu lỗi lập tức rollback.
5. Cập nhật MAINTENANCE.md và trạng thái nghiệm thu thực tế.

## Nguồn kỹ thuật
https://developers.openai.com/api/docs/models/gpt-6-luna
https://developers.openai.com/api/docs/guides/function-calling
https://developers.openai.com/api/docs/guides/tools-web-search
https://developers.openai.com/api/docs/models/gpt-4o-mini-tts
https://cloud.google.com/text-to-speech/pricing

## Bằng chứng kiểm tra bổ sung 13/11/2026
- Cloudflare root HTML ở `nmh-voice-gpt-test.magical-budget.workers.dev/` được đối chiếu byte-for-byte với PAGE tại commit `04ca132e0df80ded80fcd0735fb05fe224209ce8`: **khớp chính xác 16.015 ký tự**. Đây chỉ chứng minh HTML frontend, không chứng minh bytecode backend giống commit.
- Source V3 đầy đủ vẫn lưu được trên GitHub tại commit trên; rollback Cloudflare vẫn chưa thử.
- CI mới nhất https://github.com/hvnm1206/TikTak-Service/actions/runs/43419105881: verify 14/14 PASS, deploy SKIPPED, `CLOUDFLARE_API_TOKEN=NOT_CONFIGURED`.
- Worker production GET /health HTTP 200, GET / HTTP 200, tab BẢO TRÌ hiện đúng V3. V2 chưa xuất hiện ở production.

## 13/11/2026 — Production release gate prepared
- Cloudflare token ACTIVE and deployments READ_OK (CI run 43424361555).
- Stable rollback target pinned: `1cbf0dcc-a3a6-40e2-93af-e1a857400100`.
- Release job is opt-in via exact release commit marker and requires existing V3 100% version, verifies V2 health/UI, and attempts automatic rollback upon failure.
- This note is written before release; do not infer deploy success from this line.

## Release authorization
- 13/11/2026: Người dùng đã cấu hình Cloudflare token và yêu cầu làm theo kế hoạch cho đến khi V2 chạy. GitHub Actions release gate đã PASS thử CI ở run 43424742122. Kích hoạt deploy lần đầu, có chốt V3 version và rollback tự động.

## 13/11/2026 — First production attempt and verified rollback
- Run 43424910739: Wrangler uploaded/deployed V2; V2 /health PASSED. Smoke pipeline `curl | grep -q` returned curl SIGPIPE and false UI failure. **Automatic rollback succeeded**, restored Worker version `1cbf0dcc-a3a6-40e2-93af-e1a857400100` to 100% traffic.
- Fixed smoke to download HTML completely to file before `grep -q` (commit c4d2807). CI verify run 43425052735 PASS. New release authorized; keep pinned baseline.

## Attempt 2 — diagnosis and rollback
- Run 43425131917: upload/deploy OK; V2 health & 3 style UI OK. Negative-key smoke expected HTTP 400 but curl --fail incorrectly interpreted valid rejection as failure. Auto rollback successful to V3. Replaced smoke with explicit HTTP status=400 and JSON error assertion (commit dd181244).

## Authorized release attempt 3
- CI check 43425287967 SUCCESS, code unchanged, smoke corrected for expected HTTP 400. Release gate still requires previous V3 version baseline.

## DEPLOY VERIFIED — 13/11/2026
- Release SHA `4e1a84b697f1bc9c9e7246ad39b670d2361937da`; GitHub Actions run `43425337401` completed **SUCCESS**. CI tests 14/14 PASS. Wrangler deployed persistent Worker `nmh-voice-gpt-test` on Cloudflare account Magical Budget. No temporary Worker.
- Confirmed live endpoint: `https://nmh-voice-gpt-test.magical-budget.workers.dev/` returns HTTP 200, all three style control IDs; GET /health HTTP 200 with `version=v2-ngao-reference`, `agent=gpt-6-luna`, `voice=browser-stt+marin-tts`.
- Deploy job logs: `DEPLOY_HEALTH=V2_OK`, `DEPLOY_UI=V2_OK`, `DEPLOY_SECURITY=VALIDATION_OK`, `DEPLOY_FINAL=SUCCESS`.
- Verified rollback V3 version `1cbf0dcc-a3a6-40e2-93af-e1a857400100` in previous two release attempts. Those attempts rolled back automatically after **smoke-test script issues**, not proven V2 functional defects. Final release passed all smoke checks.
- **Still not verified**: genuine OpenAI GPT-6 Luna response with the user's own key, audio quality and continuous voice interaction on a real iPhone, real cost per exchange. Never call those PASS until tested.
- Warning: `gpt-4o-mini-tts` Speech API is deprecated with planned retirement 2027-01-06; migration will be required.

## 13/11/2026 — Diagnosis and repair of confirmed Safari fallback
- Screenshot from iPhone shows `Đang trả lời — Giọng dự phòng Safari`: Marin playback did not succeed in that user session. Exact failing step is still unknown because V2 swallowed errors.
- New source explicitly uses Web AudioContext unlocked inside iPhone START and RESUME gestures; decodes MP3 in Web Audio and plays using AudioBufferSourceNode, removing asynchronous HTMLAudioElement autoplay dependence.
- Removed automatic silent fallback to Safari: TTS errors now show a specific failure code, display `Nguồn giọng`, and can be separately tested via SETUP → THỬ GIỌNG AI MARIN.
- Worker returns clear classified OpenAI TTS errors (400, 401, 403, 429) and rejects non-audio replies; no API key is logged.
- New health marker `v2-tts-audioctx`; CI 18 test cases expected. Deployment gate pins current V2 version `9f10411e-79b9-420b-b826-e3e6be8a08b5` and automatically rolls back on failure.
- Not a confirmed iPhone audio test; requires real `THỬ GIỌNG AI MARIN` playback to establish device proof.
