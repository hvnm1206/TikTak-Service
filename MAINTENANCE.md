# NMH VOICE GPT — BẢO TRÌ HIỆN HÀNH (14/11/2026)

## 1. Production đã kiểm chứng
- URL giữ nguyên: https://nmh-voice-gpt-test.magical-budget.workers.dev/
- Cloudflare Worker: `nmh-voice-gpt-test`
- Phiên bản phát hành: `d0622605-7d01-47ba-a5aa-bbb7e5262ee9`
- Version rollback tức thời: `fc8ba001-038c-4a18-a0ac-84d3f8fff952`
- D1 production: `nmh-voice-v3` (ID `3ce295cb-a84d-4a50-abee-d14fdd903514`).
- Source: [GitHub branch](https://github.com/hvnm1206/TikTak-Service/tree/nmh-voice-actions-reminders-p0-20261114).
- Release CI: https://github.com/hvnm1206/TikTak-Service/actions/runs/43584681227 — SUCCESS; 97/97 regression PASS, prior version gate PASS, D1 Time Travel bookmark được lưu artifact 30 ngày và rollback có cấu hình.
- Sandbox Cloudflare Worker + D1 thật: https://github.com/hvnm1206/TikTak-Service/actions/runs/43584484084 — SUCCESS, kiểm tra migration, quyền truy cập, reminder claim, rollback và cleanup.
- Sau deploy, Guarded Operator GET `/health` HTTP 200, `writeVersion=semantic-actions-d1-readback-v1`; GET `/api/v3/config` 200 `ready:true`; GET `/api/reminders/capabilities` 200 `enabled:true,foregroundOnly:true`. Lần kiểm tra health ban đầu còn nhãn cũ; gọi lại không cache và URL chuẩn đều đã ra nhãn mới.

## 2. Thay đổi kiến trúc — chỉ bản chính Ngố
- Xóa `voice-write.js`, `voice-write.test.mjs`, regex phân loại ý định từ lời nói và các luồng lưu ghi chú/ghi nhớ song song trong `/api/chat`.
- Xóa thuật toán ghép quan hệ theo từ khóa và prompt chuyên biệt về quan hệ gia đình. Không hardcode tên người, ngành hoặc câu người dùng.
- GPT chọn công cụ `save_memory`, `save_note`, `update_memory`, `delete_memory`, `read_memories`, `set/list/cancel_reminder`. Backend xác thực Google subject, validate dữ liệu, D1 readback và chỉ báo thành công khi có receipt thực.
- Memory không phụ thuộc cờ nhắc việc. `loadV3Context` cấp 20 ghi nhớ gần nhất; `read_memories` chỉ đọc theo trang (50 dòng/trang) để GPT truy xuất sâu hơn. Đây không phải vector/semantic retrieval đã kiểm chứng độ chính xác trên kho lớn.
- Không sửa Ngáo, không đổi URL, luồng micro/SpeechRecognition/Marin, giao diện Vịt/Corgi, tài liệu người dùng hoặc dữ liệu D1 hiện hữu.

## 3. Mức độ nghiệm thu và giới hạn
- **Đã xác minh:** CI tự động, D1 sandbox/rollback, deploy production, HTTP/feature flags và các bước bảo vệ.
- **Chưa xác minh:** Người dùng nói trên iPhone thật với Google session và API key cá nhân; GPT Responses API thật tự chọn công cụ cho câu mới; phát Marin đúng với từng kết quả; mức chính xác truy xuất Memory trên kho lớn.
- Nghiệm thu iPhone cần: nói lưu một thông tin bất kỳ → D1 xác nhận → refresh/hỏi lại; sửa/xóa; ghi chú; nhắc giờ tự nhiên; câu hỏi bình thường không ghi; thử micro, Marin, theme. Cấm tự tuyên bố PASS nếu chưa thấy bằng chứng thực tế.
- Nếu lỗi, giữ bản sao và xác minh ngay actionErrorCode, phiên Google, bản ghi D1, nguồn gọi OpenAI, log liên quan; không thêm regex vá câu.

## 4. Tài liệu lịch sử và nguồn
- [Nhật ký bảo trì ngay trước tái cấu trúc](https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-gpt-v1/voice-deploy/archive/MAINTENANCE_PRE_UNIFIED_20261114.md) — lưu nguyên văn, không xóa.
- [Bản lưu trữ kỹ thuật cũ](https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-gpt-v1/voice-deploy/archive/MAINTENANCE_FULL_20261114.md).
- [Kế hoạch và quá trình thực hiện 7 cổng](https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-actions-reminders-p0-20261114/voice-deploy/NGO_REBUILD_7_GATE_EXECUTION_20261114.md).
- [Tài liệu cửa mới](https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-gpt-v1/voice-deploy/START_HERE_NEXT_CHAT.md).

Nguyên tắc: trạng thái ở mục 1 là mốc hiện hành; mọi phiên bản trong tài liệu lưu trữ là lịch sử, không sử dụng làm baseline deploy nếu chưa đối chiếu Cloudflare.
