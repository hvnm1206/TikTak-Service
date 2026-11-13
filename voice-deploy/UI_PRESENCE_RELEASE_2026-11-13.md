# NMH Voice — giao diện Presence Canvas
**Ngày:** 13/11/2026. **Phạm vi:** thay UI chat chữ bằng giao diện mắt điện tử trên đúng Worker hiện có.
## Tham khảo đã đọc
Tệp người dùng cung cấp `Pasted text.txt`: mã Ngáo v0.6 08/11/2026, `src/face/engine.ts` và `src/App.tsx`. Tham khảo nguyên lý Canvas 2D, trạng thái kỹ thuật, biểu cảm, mắt và nhân vật; không sao chép toàn bộ engine Ngáo hay phụ thuộc React.
## Thiết kế NMH Presence
- Canvas 2D khuôn mặt điện tử với con ngươi, nháy mắt, chuyển hướng nhìn khi chạm, quầng sáng trạng thái. Ba phong cách ĐANH ĐÁ/CHÉM GIÓ/NGHIÊM TÚC có biểu cảm, màu sáng và lông mày khác nhau.
- Trạng thái thực tế từ máy hiện có: sẵn sàng/nghe/đang xử lý/đang phát giọng/tạm dừng/lỗi. Không gửi thêm API request hoặc mở microphone thứ hai.
- Khi AI thực sự phát MP3, miệng phản ứng với mẫu tín hiệu `AnalyserNode.getByteTimeDomainData`; khi nghe, vòng sáng là dấu hiệu trạng thái, không được coi là mức âm thanh mic đo được.
- Đưa `#history` vào ngăn NHẬT KÝ, mặc định đóng. PHỤ ĐỀ mặc định tắt và có thể bật; lịch sử vẫn là dữ liệu của phiên để gửi GPT.
- Giữ các nút NÓI/KẾT THÚC/NGẮT AI/TIẾP TỤC, 3 phong cách, SETUP, BẢO TRÌ, dữ liệu cost local, API paths và kiểm soát key. Giao diện được render bởi module `voice-deploy/presence-ui.js` vào Worker; không thêm CDN/React/dependency.
- Giới hạn: Safari có thể pause micro khi tab nền; chất giọng Marin/TTS gốc không được sửa. iPhone thật và trải nghiệm thị giác cần kiểm tra sau release, test CI mới chứng minh syntax/logic mocking.
## Kiểm soát
- CI trước release: https://github.com/hvnm1206/TikTak-Service/actions/runs/43435767542 — 22/22 PASS, deploy SKIPPED, Cloudflare token ACTIVE.
- Production baseline trước release: `004087d6-f0ea-4084-bd9b-3b09d5d076e2` (CI).
- Workflow release tự chốt active version/healthy identity, phát hành vào đúng Worker `nmh-voice-gpt-test`, smoke kiểm tra /health `uiVersion=presence-canvas-v1`, Canvas, transcript, audio visualizer, UI/SECURITY/DOCS; tự rollback khi smoke fail.
- Không kết luận kiểm thử iPhone hay phí mới đã đạt khi chưa có bằng chứng thực tế.

## Release đã xác minh
- GitHub Actions run **43435921467** SUCCESS (22/22 CI PASS).
- Source release commit `ccfc91ef0d759849aeabe1e6c504fc0114ab9356`.
- Cloudflare production new version `926e2435-0d19-4383-8b45-631f1107a032`; rollback snapshot `004087d6-f0ea-4084-bd9b-3b09d5d076e2` HEALTH_VERIFIED.
- CI log: `DEPLOY_UI=PRESENCE_CANVAS_OK`, `DEPLOY_HEALTH=V2_OK`, `DEPLOY_DOCS=CANONICAL_OK`, `DEPLOY_SECURITY=VALIDATION_OK`, `DEPLOY_FINAL=SUCCESS`.
- Guarded Operator runtime GET: `/health` và `/` HTTP 200; health `uiVersion=presence-canvas-v1`, HTML có Canvas, Nhật ký, Phụ đề, AnalyserNode, ba phong cách, testVoice.
- Chưa kiểm thử cảm nhận trên iPhone thực hoặc đo billing thực.

## Sửa đồng bộ tài liệu BẢO TRÌ
- Phát hiện GET /api/docs/handover đọc bản cũ vì GitHub raw CDN cache dù GitHub HEAD đã có nội dung mới.
- Worker bổ sung query cache-busting `?v=Date.now()` cho request đọc tài liệu, giữ nguyên endpoint và quyền truy cập.
- CI trước release sửa cache: run 43436730384, 22/22 PASS; production vẫn version `926e2435-0d19-4383-8b45-631f1107a032`.


## FINAL 13/11/2026 — Sửa cache BẢO TRÌ sau release Presence
- Phát hiện: GitHub có bàn giao mới nhưng Worker GET /api/docs/handover tạm trả bản cũ do cache của raw.githubusercontent.com.
- Fix: thêm tham số chống cache `?v=Date.now()` khi Worker fetch GitHub raw; **không thay API Voice, model, giọng hoặc giao diện**.
- Release cuối: `121629381f7fb298f57c70c36ab51f28c8c2f52a` · Actions https://github.com/hvnm1206/TikTak-Service/actions/runs/43436827356 **SUCCESS**, 22/22 PASS, HEALTH/UI/DOCS/SECURITY smoke PASS.
- Cloudflare Worker current version `7ea82e92-5933-4421-be9d-39c5ca00351e`, rollback baseline predeploy `926e2435-0d19-4383-8b45-631f1107a032` (HEALTH_VERIFIED).
- Kiểm tra independent NMH Guarded Operator: GET /health HTTP 200 `uiVersion=presence-canvas-v1`; GET / HTTP 200 đầy đủ Canvas/Nhật ký/AudioAnalyser; GET /api/docs/handover HTTP 200 **đã thấy thông tin release 43435921467 mới**.
- Chưa có bằng chứng thao tác trực tiếp trên iPhone sau release; CI/HTTP không thay thế kiểm thử micro/giọng và cảm nhận người dùng trên thiết bị.

