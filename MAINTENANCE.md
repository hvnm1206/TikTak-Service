# NMH VOICE GPT — BẢO TRÌ HIỆN HÀNH (14/11/2026)

## MỚI NHẤT 14/11/2026 — GIẢM THỜI GIAN ĐẾN TIẾNG NÓI ĐẦU TIÊN
- URL chính giữ nguyên: https://nmh-voice-gpt-test.magical-budget.workers.dev/ ; Cloudflare Worker version `c547c24a-ff0a-4b6d-afe4-1bbdd80d23d9`. Rollback version `f24ae459-324a-4aef-96d0-7713454d62e4`.
- Thêm SETUP → ĐỘ TRỄ: đo từ khi Safari nhận xong câu nói đến GPT/API trả lời, Marin tạo tiếng đầu, tổng và thời gian backend D1/GPT. Không gửi nội dung voice hoặc API key vào log; số liệu theo lượt trên thiết bị.
- Chia phần giọng đầu Marin tối đa 180 ký tự thay 440 khi câu đầu dài; các phần sau 440 như cũ. Nội dung và thứ tự nguyên văn không mất, cơ chế Marin prefetch và ngắt lời giữ nguyên. **GPT vẫn phải trả xong toàn bộ câu trả lời trước khi Marin được gọi**, chưa phải streaming chồng lấn hoàn toàn.
- CI **104/104 PASS**: https://github.com/hvnm1206/TikTak-Service/actions/runs/43599883353 ; Cloudflare sandbox Worker+D1, rollback/cleanup PASS: https://github.com/hvnm1206/TikTak-Service/actions/runs/43599883356 ; production release, D1 bookmark và smoke PASS: https://github.com/hvnm1206/TikTak-Service/actions/runs/43599996114.
- UAT iPhone: nói một câu → mở SETUP đọc ĐỘ TRỄ (GPT/API, Marin → tiếng đầu, tổng, Memory/D1, GPT server). So sánh ít nhất 3-5 lượt thường và có tìm kiếm, kiểm ngắt lời, mic, âm thanh, theme, Memory/nhắc việc. **Chưa có số đo iPhone để tuyên bố tiết kiệm được bao nhiêu giây**.
- Đặc tả/test: https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-actions-reminders-p0-20261114/voice-deploy/NGO_LATENCY_V1_20261114.md


## CẬP NHẬT MỚI NHẤT — NGỐ ĐÔI MẮT SINH ĐỘNG (14/11/2026)
- Worker chính giữ nguyên https://nmh-voice-gpt-test.magical-budget.workers.dev/ , production version **`f24ae459-324a-4aef-96d0-7713454d62e4`**; rollback version `fa391d70-0eaa-4e7d-8643-1943e119619e`.
- SETUP → GIAO DIỆN NGỐ: Mặc định (canvas Presence nguyên bản), Mắt Ngố, Mắt Vịt, Mắt Corgi. Ba theme mới **chỉ có đôi mắt lớn**, đồng tử chuyển động theo chạm, mắt chớp, nhìn theo trạng thái nghe/nghĩ/nói; không xoay mặt nạ; hỗ trợ reduced motion.
- Source sửa đúng lớp UI `voice-deploy/theme-ui.js`; giữ nguyên micro, Marin, GPT, D1, Memory, Reminder và Ngáo.
- CI **101/101 PASS** https://github.com/hvnm1206/TikTak-Service/actions/runs/43588435662 ; sandbox Worker+D1 và rollback PASS https://github.com/hvnm1206/TikTak-Service/actions/runs/43587884426 ; deploy production có baseline pin và D1 bookmark PASS https://github.com/hvnm1206/TikTak-Service/actions/runs/43588003169 .
- Guarded Operator độc lập GET đúng URL production HTTP 200, HTML có theme selector, ngo-eye/ngo-iris, blink engine và SpeechRecognition.
- **Chưa kiểm chứng Safari iPhone thật**, cần người dùng đánh giá mắt, chuyển theme, mic/Marin thực tế. Không tự tuyên bố nghiệm thu thiết bị.
- Đặc tả & kết quả: https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-actions-reminders-p0-20261114/voice-deploy/NGO_EYES_ONLY_V1_20261114.md .


## 1. Production đã kiểm chứng
- URL giữ nguyên: https://nmh-voice-gpt-test.magical-budget.workers.dev/
- Cloudflare Worker: `nmh-voice-gpt-test`
- Phiên bản phát hành: `fa391d70-0eaa-4e7d-8643-1943e119619e`
- Version rollback tức thời: `d0622605-7d01-47ba-a5aa-bbb7e5262ee9`
- D1 production: `nmh-voice-v3` (ID `3ce295cb-a84d-4a50-abee-d14fdd903514`).
- Source: [GitHub branch](https://github.com/hvnm1206/TikTak-Service/tree/nmh-voice-actions-reminders-p0-20261114).
- Release CI: https://github.com/hvnm1206/TikTak-Service/actions/runs/43586216466 — SUCCESS; 99/99 regression PASS, prior version gate PASS, D1 Time Travel bookmark được lưu artifact 30 ngày và rollback có cấu hình.
- Sandbox Cloudflare Worker + D1 thật: https://github.com/hvnm1206/TikTak-Service/actions/runs/43586024270 — SUCCESS, kiểm tra migration, quyền truy cập, reminder claim, rollback và cleanup.
- Sau deploy, Guarded Operator GET `/health` HTTP 200, `writeVersion=semantic-actions-d1-readback-v1`; GET `/api/v3/config` 200 `ready:true`; GET `/api/reminders/capabilities` 200 `enabled:true,foregroundOnly:true`. Lần kiểm tra health ban đầu còn nhãn cũ; gọi lại không cache và URL chuẩn đều đã ra nhãn mới.

## 1B. Sửa nguyên nhân gốc hậu phát hành
- Bảo đảm GPT không thể phủ định lỗi D1 bằng câu “đã lưu” không có receipt; `TURN_MISMATCH` không chặn trả lời câu hỏi thường. Có bài kiểm thử giả lập GPT cố báo lưu thành công sau D1 lỗi.
- Bỏ hardcode tiêu đề `## A. HIỆN TRẠNG ĐANG CHẠY` trong đường dự phòng GitHub docs và trong smoke test. Khi dùng bản Raw dự phòng, header `x-nmh-doc-source` báo rõ `github-raw-fallback-freshness-unverified`; không tự nhận dữ liệu mới đã được xác minh.
- Lần phát hành bị lỗi smoke đều tự rollback đúng bản `d062...`; bản cuối cùng 99/99 test PASS và Guard HTTP production/health/docs đều PASS.
- Mới xác minh backend và test mô phỏng OpenAI. **Nghiệm thu iPhone + key/API thực chưa có**.

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
