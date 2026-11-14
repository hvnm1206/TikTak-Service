# NGỐ — tái cấu trúc theo 7 cổng, bằng chứng thực thi 14/11/2026

## Quy tắc nghiệm thu
Không dùng hardcode câu, tên, quan hệ, ngành hoặc regex nhận diện ngôn ngữ người dùng. Backend chỉ kiểm quyền, validate dữ liệu, thực thi công cụ, ghi D1, đọc lại và trả receipt. Không deploy production nếu CI/sandbox không đạt. Ngáo tuyệt đối không sửa.

## Gate 1 — khóa hiện trạng
- Production Worker: `nmh-voice-gpt-test` URL https://nmh-voice-gpt-test.magical-budget.workers.dev/
- Actual Cloudflare baseline version qua GitHub Action read-only: `fc8ba001-038c-4a18-a0ac-84d3f8fff952`; trạng thái health từ Guard/Operator HTTP 200, voice `browser-stt+marin-tts`, UI `presence-canvas-v1`, V3 `d1-only-google-v3`.
- Production D1 `nmh-voice-v3` UUID `3ce295cb-a84d-4a50-abee-d14fdd903514`.
- GitHub branch source `nmh-voice-actions-reminders-p0-20261114`.
- Version drift gate vẫn bật; D1 Time Travel bookmark tạo trước release.

## Gate 2 — dọn kiến trúc
- Loại bỏ `routeVoiceWrite`, `handleVoiceMemory`, `handleVoiceNote` và `memoryIntent/voiceNoteIntent` khỏi đường yêu cầu `/api/chat`; xóa `voice-write.js` và `voice-write.test.mjs`.
- Gỡ thuật toán ghép quan hệ `multi-hop` dùng từ khóa, gỡ prompt riêng quan hệ gia đình.
- Không sửa mic/SpeechRecognition/Marin/TTS/Google OAuth/Theme/Reminder.

## Gate 3 — ActionRegistry chung
- GPT chọn `save_memory`, `save_note`, `update_memory`, `delete_memory`, `read_memories`, `set/list/cancel_reminder` theo ý định tự nhiên.
- Backend dùng D1 theo đúng Google subject; ghi/sửa/xóa có readback, sự kiện action có errorCode và không báo thành công khi chưa có receipt.
- `read_memories` là công cụ chỉ đọc 50 hàng/trang (offset), GPT nhận kết quả để tự suy luận, không ép luật quan hệ.
- Nhớ/ghi chú không phụ thuộc cờ Reminder.

## Gate 4 — retrieval
- `loadV3Context` cung cấp tối đa 20 ghi nhớ gần đây, trong phạm vi user.
- Tool `read_memories` giúp GPT duyệt các dữ kiện cũ theo trang; không phải vector search và không tuyên bố độ chính xác ngữ nghĩa đã được chứng minh.
- Chưa đánh giá retrieval cho tập lớn hàng nghìn bản ghi; không coi retrieval này là giải pháp semantic search hoàn chỉnh.

## Gate 5 — kiểm thử
- CI: https://github.com/hvnm1206/TikTak-Service/actions — các bài legacy + semantic mới phải đạt.
- Các trường hợp: ghi Memory, ghi Note, cập nhật/xóa, không đăng nhập, không mạo nhận lời người dùng, cờ reminder OFF, không ghi khi hỏi thường, truy xuất >50 ghi nhớ, không lộ dữ liệu tài khoản khác, avatar/mic/Marin regression.
- Cloudflare sandbox tạo Worker và D1 tách biệt, migrate schema thật, thử API/auth/rollback và xóa tài nguyên tạm.
- Giới hạn: kiểm thử mô phỏng tool-call của OpenAI, chưa có key thật và phiên iPhone thực trong CI.

## Gate 6 — phát hành
- Chỉ sau khi các gate trên PASS, deploy đúng Worker cũ cùng URL, qua GitHub Actions có baseline pin, D1 Time Travel và rollback.
- Không chạm Ngáo. Không sửa bảng D1 production ngoài migration additive đã có.

## Gate 7 — nghiệm thu iPhone
- Cần thiết bị thực đã đăng nhập Google và API key người dùng; test ghi→refresh→hỏi lại, đổi câu, sửa/xóa, nhắc đúng giờ, mic/Marin/Theme.
- Phân biệt nghiệm thu phần mềm tự động với nghiệm thu loa/micro thật. Không tuyên bố PASS khi chưa có bằng chứng.

## Trạng thái
Đây là nhật ký các cổng và phải được cập nhật bằng run-ID, SHA, version thực sau khi triển khai.