# NMH VOICE GPT — ĐIỂM BÀN GIAO DUY NHẤT CHO CỬA MỚI


## BẢO TRÌ MỚI NHẤT — 13/11/2026 (ƯU TIÊN HƠN GHI CHÚ CŨ)
- Chính thức `https://nmh-voice-gpt-test.magical-budget.workers.dev/`, Worker `nmh-voice-gpt-test`, `/health` trả `uiVersion=presence-canvas-v1`. AI và giọng giữ `gpt-6-luna` / `marin`.
- **Cloudflare version đang chạy:** `abcac5e5-0749-45ac-8c94-1d1bed49df82`; source release commit `e2b08266120df63840c516cc05e9f48cab7ac1a1`. [Actions run 43440716438](https://github.com/hvnm1206/TikTak-Service/actions/runs/43440716438) SUCCESS, **26/26 tests PASS**, smoke HEALTH/UI PRESENCE/DOCS/SECURITY PASS; rollback snapshot trước deploy `e6cb6c6d-064c-413e-8a12-93cf4873fa00`.
- Trong tab BẢO TRÌ: tài liệu `MAINTENANCE.md` đã được cập nhật commit `ac14f06c3df133642621b286ef7b8efd0413c63b`. Có phần tổng hợp hiện trạng, 16 findings, phản hồi giao diện “Tao thấy khá tốt đấy”, nguồn code, chi phí, đối sách, bản ghi lịch sử. Đây là file **chuẩn hiện trạng**, không xem các đoạn cũ trong handover này là bản production.
- Đã xử lý lỗi Github Raw cache cũ và GitHub Contents API ẩn danh đôi lúc trả 403 → Worker 502: dùng Cloudflare edge cache TTL 120 giây + raw fallback **có kiểm tra marker**, lỗi rõ nếu không lấy được. Sau release, 5 lượt probe độc lập BẢO TRÌ liên tiếp HTTP 200 và đúng nội dung 22.422 ký tự. Commit tài liệu sau đó có thể chưa xuất hiện tại edge trong tối đa ~120 giây.
- Người dùng **đánh giá tích cực sơ bộ về UI Presence**, không có cơ sở tuyên bố nghiệm thu micro/giọng liên tục toàn chuỗi trên iPhone ở release này. F01 TTS deprecation, F02 phí thực, F03 budget cap, F06 E2E còn mở; xem đầy đủ F01–F16 trong `MAINTENANCE.md`.
- Chỉ ghi hoàn thành theo bằng chứng: source SHA, Workflow CI, Cloudflare version, smoke, probe đọc app; không có hóa đơn OpenAI thật thì không kết luận đạt 50–150đ/lượt. Không tạo Worker mới, không sửa `main`, không dùng `--temporary`.
**Chốt:** 13/11/2026. **Mục đích:** tiếp tục từ trạng thái thực tế, không dựng lại, không hỏi lại thông tin đã có, không làm hỏng production.



## FINAL 13/11/2026 — Sửa cache BẢO TRÌ sau release Presence
- Phát hiện: GitHub có bàn giao mới nhưng Worker GET /api/docs/handover tạm trả bản cũ do cache của raw.githubusercontent.com.
- Fix: thêm tham số chống cache `?v=Date.now()` khi Worker fetch GitHub raw; **không thay API Voice, model, giọng hoặc giao diện**.
- Release cuối: `121629381f7fb298f57c70c36ab51f28c8c2f52a` · Actions https://github.com/hvnm1206/TikTak-Service/actions/runs/43436827356 **SUCCESS**, 22/22 PASS, HEALTH/UI/DOCS/SECURITY smoke PASS.
- Cloudflare Worker current version `7ea82e92-5933-4421-be9d-39c5ca00351e`, rollback baseline predeploy `926e2435-0d19-4383-8b45-631f1107a032` (HEALTH_VERIFIED).
- Kiểm tra independent NMH Guarded Operator: GET /health HTTP 200 `uiVersion=presence-canvas-v1`; GET / HTTP 200 đầy đủ Canvas/Nhật ký/AudioAnalyser; GET /api/docs/handover HTTP 200 **đã thấy thông tin release 43435921467 mới**.
- Chưa có bằng chứng thao tác trực tiếp trên iPhone sau release; CI/HTTP không thay thế kiểm thử micro/giọng và cảm nhận người dùng trên thiết bị.

## CẬP NHẬT GIAO DIỆN NMH PRESENCE — RELEASE 13/11/2026
- **Live production:** https://nmh-voice-gpt-test.magical-budget.workers.dev/ — `GET /health` HTTP 200 trả `version=v2-tts-audioctx`, `uiVersion=presence-canvas-v1`.
- **Release:** https://github.com/hvnm1206/TikTak-Service/actions/runs/43435921467 — SUCCESS; source commit `ccfc91ef0d759849aeabe1e6c504fc0114ab9356`, Cloudflare version `926e2435-0d19-4383-8b45-631f1107a032`.
- **Backup/rollback baseline:** `004087d6-f0ea-4084-bd9b-3b09d5d076e2`, chốt và health-verified trước deploy. Rollback không kích hoạt vì smoke PASS; đường rollback sẵn trong workflow nhưng chưa diễn tập với bản UI này.
- **Verify:** 22/22 automated tests PASS (mock API); smoke production HEALTH/UI PRESENCE/DOCS/SECURITY PASS; probe read-only NMH Guarded Operator cho /health, /, /api/docs/handover HTTP 200, đủ marker Canvas, audio analyser, Nhật ký, Phụ đề, 3 phong cách, nút Marin.
- UI từ module `voice-deploy/presence-ui.js`: khuôn mặt Canvas 2D, biểu cảm theo trạng thái/phong cách, con ngươi nhìn theo chạm, nháy mắt, miệng theo **audio thật** qua Web Audio AnalyserNode. Không mở thêm API hoặc mic thứ hai.
- Hội thoại chữ được chuyển vào **NHẬT KÝ** mặc định đóng; PHỤ ĐỀ mặc định tắt có thể bật. Các nút NÓI, KẾT THÚC, NGẮT AI, TIẾP TỤC, SETUP, BẢO TRÌ và sổ ước phí còn nguyên.
- Bàn giao đầy đủ: [UI_PRESENCE_RELEASE_2026-11-13.md](UI_PRESENCE_RELEASE_2026-11-13.md).
- **Giới hạn xác minh:** chưa có kiểm thử thao tác/chất lượng trực quan trên Safari iPhone thực cho bản UI mới; chưa đo end-to-end qua micro + OpenAI + Marin trên bản này. Chưa coi toàn bộ trải nghiệm là nghiệm thu bởi người dùng; F01–F16 vẫn theo bảng remediation trước đó.

## 1. Trạng thái hiện tại
- **App đang hoạt động:** https://nmh-voice-gpt-test.magical-budget.workers.dev/
- Cloudflare account **Magical Budget**, Account ID `769c2ab4af5ad50700039d473a72d48e`; Worker **`nmh-voice-gpt-test`**.
- URL `/health` đã được kiểm tra HTTP 200, trả `version=v2-tts-audioctx`, `agent=gpt-6-luna`, `voice=browser-stt+marin-tts`.
- **Release mới nhất đã kiểm chứng:** GitHub Actions run **43431996366** SUCCESS, CI **20/20 PASS** (OpenAI mock), smoke HEALTH/UI/DOCS/SECURITY PASS; source commit `a9c4a569499d47481bc7e1b7387d434735dec315`, Cloudflare version `004087d6-f0ea-4084-bd9b-3b09d5d076e2`. TTS AudioContext trước đó: run `43427854906`.
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
- **Đã có** sổ chi phí ước tính theo ngày/tháng ngay trên iPhone: usage GPT Standard short/cached, số lượt TTS và giây audio giải mã. **Chưa có** Usage/Costs hóa đơn, token TTS thực, hard budget caps hoặc backend telemetry; con số hiển thị KHÔNG PHẢI chi tiêu thực.
- Công cụ tìm kiếm giới hạn ở Open-Meteo, Wikipedia, Google News RSS: không được nói là đã tra cứu toàn Internet.
- CI không thử nghiệm OpenAI thật; chưa đo latency, độ chính xác hay hóa đơn thật.
- Cloudflare observability đang tắt, không có storage hội thoại hay telemetry đủ để truy nguyên lỗi.
- **F11 đã xử lý và deploy:** workflow lấy active Cloudflare version động, kiểm tra 100% traffic và app identity, chốt rollback version trước khi deploy. Đợt release vừa qua đã xác minh baseline `aa8866ec-09e4-4ee7-8234-6e62682cca15`; version mới `004087d6-f0ea-4084-bd9b-3b09d5d076e2`. Kết quả rollback thực tế của đợt mới chưa được kích hoạt vì smoke PASS; phải kiểm tra lại trước mỗi release.
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
1. **F01 P0:** Chuyển `gpt-4o-mini-tts` (ngừng 06/01/2027) sang Realtime API với `gpt-realtime-2.1-mini`, phải thử đúng giọng/tốc độ/chi phí. `gpt-realtime-2.1-mini` KHÔNG dùng trực tiếp ở `/v1/audio/speech`. Giữ tuyến cũ cho đến khi có đường thay thế nghiệm thu.
2. **F02/F03:** Đối chiếu OpenAI Organization Usage/Costs thực với sổ **ước tính cục bộ**; xây dựng metadata request ID không chứa key/nội dung, số lượt audio, ngưỡng cảnh báo/hard cap ở nơi phù hợp. Không coi ước tính TTS 0,015 USD/phút là billing.
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
- Release mới nhất SUCCESS: https://github.com/hvnm1206/TikTak-Service/actions/runs/43431996366
- Release TTS AudioContext trước đó: https://github.com/hvnm1206/TikTak-Service/actions/runs/43427854906
- Sửa chữa và thứ tự F01–F16: https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-gpt-v1/voice-deploy/VOICE_V21_REMEDIATION_2026-11-13.md
- Audit: https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-gpt-v1/voice-deploy/AUDIT_COST_2026-11-13.md
- Implementation history: https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-gpt-v1/voice-deploy/V2_IMPLEMENTATION.md

**Giới hạn nghiệm thu:** HTML/health/docs/security đã PASS production; chưa chạy API GPT/TTS thật và chưa đo hóa đơn hoặc nghe bản release này trên iPhone. Người dùng đã nghe bản Marin trước đó; không tự phủ nhận bằng chứng ấy.

**Nghiệm thu bàn giao này:** cửa mới đọc tài liệu này và audit, kiểm tra HEAD commit, health, Actions và quyền tool; sau đó làm các bước kỹ thuật cần thiết theo findings. Không hỏi lại địa chỉ repo, Worker, account, nhánh, model, giọng hoặc nội dung audit đã ghi.
