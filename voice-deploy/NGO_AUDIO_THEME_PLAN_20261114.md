# NGỐ Audio + Theme V1 — kế hoạch khóa phạm vi (14/11/2026)

## KẾT QUẢ THỰC THI / ĐỐI CHIẾU KẾ HOẠCH
- Bước 1 kiểm tra nguồn Presence/Marin: HOÀN THÀNH.
- Bước 2 WebAudio gain mặc định 1.55x, giới hạn 1–2.5 + compressor và slider lưu localStorage: HOÀN THÀNH, qua test.
- Bước 3 giao diện Mặc định/Vịt/Corgi SVG có trạng thái động, không can thiệp luồng mic: HOÀN THÀNH, qua test.
- Bước 4 CI 71 legacy + 20 new PASS; sandbox Cloudflare D1 real, kiểm tra UI và rollback PASS: https://github.com/hvnm1206/TikTak-Service/actions/runs/43579648460 .
- Bước 5 Production release PASS cùng URL: https://github.com/hvnm1206/TikTak-Service/actions/runs/43579758792 ; version mới `cd66b9f6-b7a7-4970-abf8-ce1ef19e1446`. Rollback version `08e0bbf2-a2e5-4b98-94dc-0cfee882e5b6`. Lưu D1 bookmark artifact 30 ngày. Guard HTTP 200 health/config/capabilities.
- Bước 6 iPhone thật: CHỜ NGƯỜI DÙNG THỬ. Chưa xác minh độ to thực, âm bị rè hay giao diện Safari. Không đánh đồng test tự động với nghiệm thu thiết bị.
- Không sửa Ngáo. Production Memory V2, Reminder, D1, Google OAuth, Web Search giữ nguyên.
- Lỗi phát hiện và sửa trong quá trình: lần đầu chèn gain vào audio source trước `enhanceVoicePage` làm mất anchor audio meter của Presence, CI FAIL; đã chuyển sang post-Presence patch `volume-ui.js`, chạy lại CI và sandbox PASS mới triển khai.
- Chức năng âm lượng nhắc việc chạy từ `reminders-client.js` là một kênh phát độc lập, chưa tăng gain; phạm vi nâng âm lần này là Marin hội thoại và nút THỬ GIỌNG AI MARIN trong SETUP.


## Mục tiêu
1. Khắc phục giọng Marin nhỏ trên iPhone bằng WebAudio gain có giới hạn 1.00–2.50x, default 1.55x; chặn đỉnh bằng DynamicsCompressor, cho người dùng kéo thanh âm lượng riêng trong SETUP, lưu localStorage.
2. Ba giao diện chọn độc lập: Mặc định (giao diện cũ), Vịt Ngố (mascot gốc tự vẽ SVG), Corgi Ngố (mascot gốc tự vẽ SVG). Giao diện có hoạt ảnh theo trạng thái nghe/nghĩ/nói/lỗi. Dữ liệu/chức năng không đổi.
3. Giữ nguyên mic, SpeechRecognition, hiện trạng Marin, avatar NMH Presence, Web Search, Reminder P0, Memory V2, Google OAuth, API key, D1. Không chạm Ngáo.

## Bước + bằng chứng nghiệm thu
- 1. Kiểm tra mã thật: `voice-deploy/worker.js` và `presence-ui.js`. Xác định `enhanceVoicePage` đang chiếm quyền vá đường WebAudio meter.
- 2. Volume: thêm `volume-ui.js` để *sau* khi Presence biến đổi HTML mới gắn `AudioBufferSource → Analyser (avatar cũ) → Gain → Compressor → destination`; giữ nguyên `avatarFace.setAudio(meter)`. Thanh chỉnh lưu `nmh_voice_gain_v1`.
- 3. Theme: `theme-ui.js` chỉ thêm CSS, select trong SETUP, SVG tự thiết kế, MutationObserver đọc status; không sửa event nhận dạng nói/micro/TTS/Backend.
- 4. Regression: 71 bài Voice/V3/Memory cũ + 17 bài Reminder + bài theme/volume mới; parse HTML/JS; sandbox Worker + D1 riêng với real remote schema, kiểm tra markers, rollback và cleanup.
- 5. Production: sau khi CI/sandbox xanh, snapshot Worker version + D1 Time Travel bookmark, deploy qua workflow riêng có preflight version drift, rollback đúng phiên bản nếu smoke không đạt. Giữ URL `nmh-voice-gpt-test.magical-budget.workers.dev`.
- 6. Nghiệm thu iPhone: người dùng thử giọng Marin ở 1x và 1.55x/2x, kiểm tra có to hơn và không rè; đổi Mặc định/Vịt/Corgi, nói chuyện, nhắc 2 phút, tra cứu, Memory. Không tự nhận iPhone PASS trước khi có ảnh/log.

## Kiểm soát
- Nguồn release: branch `nmh-voice-actions-reminders-p0-20261114` (KHÔNG dùng branch tài liệu `nmh-voice-gpt-v1`).
- Không thay file Ngáo/hạ tầng Ngáo.
- Không thay model, Marin hoặc logic nhận giọng.
- Nếu sandbox test thất bại: sửa đúng chặng lỗi trước release.
- Nếu lỗi sau production: rollback đúng Worker version snapshot, giữ D1 additive.

## UI AUDIT ADDENDUM — Mascot đúng vùng hiển thị
- Đã kiểm tra layout NMH Presence: canvas cũ nằm trong `.visual-field`; sau bản phát hành đầu, mascot mới chèn sau status gây trùng 2 mặt. Phát hiện bằng source audit; chưa có bằng chứng thiết bị bị lỗi.
- Sửa: `theme-ui.js` gắn mascot trực tiếp vào `.visual-field`, chỉ ẩn `#avatar` khi theme duck/corgi, mặc định không ẩn. Theme khác vẫn nhận status từ MutationObserver, engine Presence vẫn hoạt động.
- Bắt buộc CI và sandbox rollback lại PASS trước khi phát hành hotfix.
