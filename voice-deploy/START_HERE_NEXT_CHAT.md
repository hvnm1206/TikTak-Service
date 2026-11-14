# BÀN GIAO NGỐ — TRẠNG THÁI CHÍNH THỨC 14/11/2026

## 1. Đọc trước khi sửa
- URL chính giữ nguyên: https://nmh-voice-gpt-test.magical-budget.workers.dev/
- Worker `nmh-voice-gpt-test`, Cloudflare account `769c2ab4af5ad50700039d473a72d48e`.
- Production Worker version **`fa391d70-0eaa-4e7d-8643-1943e119619e`** đã deploy. Rollback code target **`d0622605-7d01-47ba-a5aa-bbb7e5262ee9`**.
- D1 `nmh-voice-v3` ID `3ce295cb-a84d-4a50-abee-d14fdd903514`, D1 Time Travel bookmark trong artifact của release GitHub Actions (retention 30 ngày).
- **Nguồn deploy:** https://github.com/hvnm1206/TikTak-Service/tree/nmh-voice-actions-reminders-p0-20261114 ; nhánh `nmh-voice-gpt-v1` CHỈ phục vụ docs, không lấy source code từ nhánh này để deploy.
- Production release evidence: https://github.com/hvnm1206/TikTak-Service/actions/runs/43586216466 — PASS, 99/99 tests, post-deploy smoke/rollback gate.
- Cloudflare sandbox isolated D1/rollback: https://github.com/hvnm1206/TikTak-Service/actions/runs/43586024270 — PASS.

## 2. Kiến trúc hoạt động
- 1 input Voice hoặc Text → GPT nhận ngữ nghĩa và chọn công cụ → backend xác thực Google subject, thực hiện D1 và đọc lại → xác nhận dựa trên receipt → Marin TTS.
- Tools: `save_memory`, `save_note`, `update_memory`, `delete_memory`, `read_memories`, `set_reminder`, `list_reminders`, `cancel_reminder`; công cụ public search như trước.
- Đã xóa đường regex classifier/trợ lý phân loại ghi chú và lưu Memory song song, xóa đặc thù quan hệ gia đình; không hardcode câu người dùng/tên/ngành.
- Memory retrieval: 20 bản ghi gần đây + công cụ `read_memories` 50 bản ghi/trang, đúng owner. Đây không phải vector retrieval đã nghiệm thu trên kho rất lớn.
- Receipt Guard: không báo lưu thành công nếu D1 không xác nhận; lỗi `TURN_MISMATCH` không chiếm chỗ của câu hỏi bình thường.
- Không sửa micro, Marin, giao diện default/Vịt/Corgi, Google OAuth, Memory V2 hay Ngáo. Reminder chỉ phát khi ứng dụng còn mở (foreground only).

## 3. Sự cố đã xử lý
- Triệu chứng ghi Memory bị nhầm Reminder và đòi giờ: do nhiều bộ phân loại/regex chồng chéo. Dọn sạch và sử dụng GPT semantic tools chung.
- CI sau đó phát hiện khả năng GPT xác nhận giả sau write failure: đã chặn bằng receipt.
- Hai lần rollout hotfix đầu bị rollback bởi hardcode tiêu đề `MAINTENANCE.md` của bản cũ trong GitHub Raw fallback và smoke; đã sửa: kiểm cấu trúc Markdown chung, gắn nhãn `freshness-unverified` khi nguồn fallback, smoke vẫn kiểm HTTP 200. Bản cuối PASS.

## 4. Bằng chứng và việc còn lại
- Guarded Operator sau deploy: `/health` HTTP 200 `semantic-actions-d1-readback-v1`, `/api/v3/config` 200 READY D1, `/api/reminders/capabilities` 200 enabled true, `/api/docs/maintenance` 200.
- **CHƯA NGHIỆM THU**: iPhone thực có Google login và BYOK OpenAI, nói tự nhiên save/refresh/read/edit/delete, speech+Marin, reminder đúng giờ, theme; khả năng model thật chọn tool đúng trên lời nói chưa từng thử. Không gọi bản này là 7/7 PASS cho tới khi có bằng chứng.
- Mọi lỗi từ thực địa phải có time, HTTP, actionErrorCode (nếu có), phạm vi user, truy dữ liệu read-only; không thêm regex vá câu.

## 5. Tài liệu giữ lại
- [MAINTENANCE hiện hành](https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-gpt-v1/MAINTENANCE.md)
- [Nhật ký 7 cổng thực thi](https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-actions-reminders-p0-20261114/voice-deploy/NGO_REBUILD_7_GATE_EXECUTION_20261114.md)
- [Bàn giao đầy đủ trước tinh gọn](https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-gpt-v1/voice-deploy/archive/START_HERE_PRE_UNIFIED_20261114.md), lưu nguyên văn.
- [MAINTENANCE lịch sử](https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-gpt-v1/voice-deploy/archive/MAINTENANCE_PRE_UNIFIED_20261114.md), lưu nguyên văn.
