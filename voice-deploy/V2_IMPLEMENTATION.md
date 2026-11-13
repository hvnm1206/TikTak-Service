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
