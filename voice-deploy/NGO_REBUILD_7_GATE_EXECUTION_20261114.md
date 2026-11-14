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
## Kết quả đối chiếu sau triển khai — 14/11/2026
- Gate 1 baseline: `fc8ba001-038c-4a18-a0ac-84d3f8fff952` (trước release), D1 `nmh-voice-v3`, kiểm tra production D1 Time Travel bookmark ở workflow.
- Gate 2/3: Xóa router câu cứng và classifier chồng chéo; GPT action registry thống nhất, xác thực user và D1 readback.
- Gate 4: Bỏ matcher quan hệ viết riêng; thêm trang `read_memories` chỉ đọc, Google-owner isolation. Chưa đánh giá chất lượng retrieval quy mô lớn.
- Gate 5: **97/97 tests PASS** (70 core + 27 reminders), https://github.com/hvnm1206/TikTak-Service/actions/runs/43584484132 . Cloudflare sandbox D1, test live auth/reminder, rollback và cleanup PASS https://github.com/hvnm1206/TikTak-Service/actions/runs/43584484084 .
- Gate 6: Production release **SUCCESS** https://github.com/hvnm1206/TikTak-Service/actions/runs/43584681227 . New Worker version `d0622605-7d01-47ba-a5aa-bbb7e5262ee9`, preserved URL and D1. Rollback version `fc8ba001-038c-4a18-a0ac-84d3f8fff952`, Time Travel bookmark in GitHub 30-day artifact. Guarded Operator read-only post-release GET /health canonical and cache-busting 200 with `writeVersion=semantic-actions-d1-readback-v1`; /api/v3/config ready D1; /api/reminders/capabilities enabled true. First non-cachebusting probe returned old health shortly after deploy; subsequent probes confirmed new label. Do not hide this transient inconsistency.
- Gate 7: **CHƯA ĐẠT** — real iPhone session, OpenAI API key, SpeechRecognition, Marin spoken loop and post-refresh memory still require actual owner UAT. All 97 tests use controlled mocked OpenAI tool calls; do not call them proof of real OpenAI semantic decisions in arbitrary speech.
- MAINTENANCE in-app was near its 60k character maximum. Archived full snapshot at `voice-deploy/archive/MAINTENANCE_PRE_UNIFIED_20261114.md`, then replaced the live maintenance index with a concise current-version and evidence report; no historical information destroyed.
