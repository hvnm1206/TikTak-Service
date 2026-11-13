# NMH VOICE GPT — ĐIỂM BÀN GIAO DUY NHẤT CHO CỬA MỚI
**Chốt:** 13/11/2026. **Mục đích:** tiếp tục từ trạng thái thực tế, không dựng lại, không hỏi lại thông tin đã có, không làm hỏng production.

## 1. Trạng thái hiện tại
- **App đang hoạt động:** https://nmh-voice-gpt-test.magical-budget.workers.dev/
- Cloudflare account **Magical Budget**, Account ID `769c2ab4af5ad50700039d473a72d48e`; Worker **`nmh-voice-gpt-test`**.
- URL `/health` đã được kiểm tra HTTP 200, trả `version=v2-tts-audioctx`, `agent=gpt-6-luna`, `voice=browser-stt+marin-tts`.
- Bản sửa TTS AudioContext chính thức deploy qua GitHub Actions run **43427854906**: SUCCESS, HEALTH/UI/SECURITY smoke PASS. CI **18/18** tests PASS (upstream giả lập; không được coi là end-to-end live).
- Người dùng đã nghe giọng mới trên iPhone và nhận xét **“nghe cũng được”**. Không được lặp lại tuyên bố “chưa ai nghe thực tế”; cũng **không** suy diễn rằng đã nghiệm thu mọi luồng hoặc giống chính xác giọng Ngáo.
- Giọng cũ Safari fallback được bỏ khỏi source V2.1; âm thanh Marin có nút **SETUP → THỬ GIỌNG AI MARIN**, lỗi TTS được báo cụ thể.

## 2. GitHub nguồn sự thật
- Repository: https://github.com/hvnm1206/TikTak-Service
- **Chỉ sửa branch `nmh-voice-gpt-v1`, KHÔNG sửa main.**
- `voice-deploy/worker.js`: Cloudflare Worker + embedded Safari UI, nhận dạng giọng Safari, AudioContext, /api/chat, /api/tts, /api/test, /health, /api/docs.
- `voice-deploy/agent-v2.js`: OpenAI Responses API `gpt-6-luna`, 3 phong cách, auto function calling; 4 tool: time, weather (Open-Meteo), Wikipedia, Google News RSS.
- `voice-deploy/wrangler.jsonc`: cấu hình Worker name và entrypoint.
- `.github/workflows/nmh-voice-preview.yml`: Node test on push, release gated by commit message `release(voice): V2 approved...` hoặc workflow_dispatch, Cloudflare token qua GitHub Secret `NMH_CF_API_TOKEN`, rollback on smoke failure.
- `voice-deploy/worker-v2.test.mjs`, `agent-v2.test.mjs`: tests có upstream mocks.
- `HANDOVER.md`, `MAINTENANCE.md`: lịch sử bàn giao/bảo trì, có cả trạng thái cũ. **Tài liệu này là điểm hiện trạng ưu tiên khi mâu thuẫn với các đoạn cũ.**

## 3. Kết quả audit vừa hoàn thành
**BẮT BUỘC ĐỌC** `voice-deploy/AUDIT_COST_2026-11-13.md` trước khi sửa. Audit có 16 findings (F01–F16), chi phí theo kịch bản, phương án và giới hạn bằng chứng.
- Rủi ro cấp bách: tuyến `gpt-4o-mini-tts` cần kiểm tra lifecycle/deprecation trước khi tiếp tục phát triển dài hạn, chọn phương án thay thế không làm mất chất giọng đang dùng.
- Backend **chưa ghi riêng chi phí TTS/audio** hay tổng phí/lượt, chưa có budget caps hoặc Usage API thực; ước tính `estimatedModelUsd` chỉ tính GPT và có thể chưa khớp giá mới.
- Công cụ tìm kiếm giới hạn ở Open-Meteo, Wikipedia, Google News RSS: không được nói là đã tra cứu toàn Internet.
- CI không thử nghiệm OpenAI thật; chưa đo latency, độ chính xác hay hóa đơn thật.
- Cloudflare observability đang tắt, không có storage hội thoại hay telemetry đủ để truy nguyên lỗi.
- GitHub Actions đang chốt cố định **rollback baseline `9f10411e-79b9-420b-b826-e3e6be8a08b5`**: đây là version trước V2.1, nên nếu tiếp tục release phải xác minh production mới và cập nhật gate/rollback chính xác, không tự triển khai khi stale.
- Đọc giá nguồn chính thức tại thời điểm quyết định; chi phí trong audit là **phép tính giả định**, không phải phí đã được trừ.

## 4. Chi phí từ audit (CHỈ THAM KHẢO)
Theo giả định 1 USD ≈ 25.675 VND, giá GPT/TTS trong report và chi phí âm thanh theo thời gian tạo:
- Trả lời ~8 giây: Nghiêm túc **~55đ/lượt**, Đanh đá/Chém gió **~78đ/lượt**.
- ~15 giây: **~103đ** / **~147đ/lượt**.
- ~30 giây: **~206đ** / **~293đ/lượt**.
- 100 lượt/ngày trong 30 ngày ở kịch bản ~15 giây: **~310.000đ** / **~441.000đ/tháng**.
- TTS là hạng mục chính; nếu dùng giọng trẻ, playbackRate/speed làm tỷ lệ giá khác, **phải đo audio usage thực**.
- Mục tiêu khoảng **50–150đ/lượt**, không tính giả định là đã đạt.
- **Không sử dụng bảng này để lập báo giá thương mại trước khi đối chiếu giá OpenAI và token hóa đơn.**

## 5. Thứ tự việc tiếp theo
1. Đối chiếu giá/model lifecycle mới nhất từ trang chính thức và xác minh tuyến TTS thay thế còn duy trì giọng/chi phí mong muốn. Không đổi production trước khi test.
2. Tạo đo lường chi phí thực, gắn ID lượt: số API calls, GPT input/output tokens, số TTS chunks, thời lượng audio được tạo, chi phí ước tính và lỗi; tuyệt đối **không log API key** hoặc nội dung nhạy cảm.
3. Thiết lập cap, thông báo chi phí và công cụ chẩn đoán; xác minh iPhone và API thật; kiểm tra chất giọng không suy giảm.
4. Sửa các findings còn lại từ F01–F16 theo ưu tiên, chạy CI và smoke; kiểm tra rollback thực tế trước deploy tiếp.
5. Cập nhật lại file này, MAINTENANCE.md và báo cáo audit sau mỗi đợt triển khai.

## 6. Quy tắc bàn giao / quyền thao tác
- Mục tiêu là app chạy thật, không phải chỉ viết prompt/báo cáo. Tuân theo Guard và dùng đúng Operator/GitHub/Cloudflare tools khi có.
- Không hard-code câu hỏi, không tự tạo Worker/URL mới, không dùng `wrangler deploy --temporary`, không làm mất chức năng đang chạy.
- Chỉ kết luận PASS khi có nguồn, log CI, mã phiên bản và kiểm chứng production; tách nguồn/CI mock và kiểm thử thiết bị thật.
- Không yêu cầu người dùng dán token API/Cloudflare vào chat. GitHub Actions secret đã được cấp; các quyền công cụ cần được kiểm tra ngay trong phiên mới.
- **Không coi gói source Ngáo là repository NMH Voice; Ngáo chỉ là chuẩn tham khảo về giọng và điều phối AI.**

## 7. Link kiểm chứng chính
- Production: https://nmh-voice-gpt-test.magical-budget.workers.dev/
- Live health: https://nmh-voice-gpt-test.magical-budget.workers.dev/health
- Release SUCCESS: https://github.com/hvnm1206/TikTak-Service/actions/runs/43427854906
- CI 18/18: https://github.com/hvnm1206/TikTak-Service/actions/runs/43427730110
- Audit: https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-gpt-v1/voice-deploy/AUDIT_COST_2026-11-13.md
- Implementation history: https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-gpt-v1/voice-deploy/V2_IMPLEMENTATION.md

**Nghiệm thu bàn giao này:** cửa mới đọc tài liệu này và audit, kiểm tra HEAD commit, health, Actions và quyền tool; sau đó làm các bước kỹ thuật cần thiết theo findings. Không hỏi lại địa chỉ repo, Worker, account, nhánh, model, giọng hoặc nội dung audit đã ghi.
