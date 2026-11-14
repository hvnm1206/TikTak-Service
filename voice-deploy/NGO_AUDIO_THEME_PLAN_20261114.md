# NGỐ Audio + Theme V1 — kế hoạch khóa phạm vi (14/11/2026)

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
