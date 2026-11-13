# NMH VOICE GPT — BẢO TRÌ / NHẬT KÝ KỸ THUẬT
Cập nhật gốc: 13/11/2026.
Nguồn của sự thật: GitHub nhánh nmh-voice-gpt-v1, mã nguồn tại voice-deploy/worker.js.
Không tự tạo trạng thái PASS; thay đổi hạng mục này sau khi có bằng chứng.

## Hiện trạng
- Người dùng đã xác nhận ứng dụng Cloudflare V1 chạy OK trên iPhone.
- Source có chức năng hội thoại tiếng Việt dùng Web Speech API + OpenAI Text API.
- Có SETUP lưu API key bằng localStorage, nút xóa/thay key, thanh pitch/rate, nghe thử và đặt lại.
- Tồn tại hai URL Cloudflare do deploy temporary. Quyền sở hữu bản sửa mới chưa được xác minh đầy đủ.
- Không có tài khoản người dùng, database hay OpenAI Realtime API.

## Các phiên bản / bằng chứng
- 534d4dd79a93dc897fdcbe59d46447d2adc4b2d1: Cloudflare Voice đầu tiên. GitHub Actions run 43392576969 SUCCESS.
- 81038e70eb41084653ee53f576043e7848c38b43: localStorage cho key, pitch/rate, nghe thử; run 43395672858 SUCCESS.
- Bản tiếp theo: thêm tab BẢO TRÌ trong app, đọc HANDOVER.md / MAINTENANCE.md và COPY BÀN GIAO; cập nhật commit và deployment bằng bằng chứng thực tế.

## Các lỗi và xử lý
- Lovable hết credits và xuất hiện login: bỏ Lovable.
- Apps Script iframe làm Safari báo SpeechRecognition not-allowed: chuyển frontend sang HTTPS Cloudflare Worker độc lập.
- Chẩn đoán ban đầu nhầm “thiếu công cụ Cloudflare”: dùng GitHub Actions + Wrangler đã deploy thành công.
- Không lưu API key: đã thêm lựa chọn lưu tại localStorage trên iPhone.
- AI tự nhận nhầm model: phải dùng cấu hình gpt-4o-mini thật, không tin phát biểu tự suy đoán của model.
- Workflow temporary mỗi lần sinh tài khoản mới: vấn đề còn tồn tại, cần giải quyết trước khi xem là hệ thống CI/CD lâu dài.

## Thứ tự ưu tiên
P0: Xác minh quyền sở hữu Cloudflare Worker đang sử dụng, chuẩn hóa việc deploy vào cùng một URL (không tự tạo temporary).
P1: Rà soát bảo mật và quyền truy cập khi dùng API key ở localStorage.
P1: Kiểm chứng hồi quy iPhone: STT → GPT → TTS → nghe lượt kế; SETUP và pitch/rate.
P2: Kiểm thử chuyển nền, mất mạng, thời gian thoại, báo lỗi rõ ràng.
P2: Đo token và kiểm soát chi phí.

## Quy trình sửa
1. Xác nhận tác vụ/nghiệm thu. 2. Đọc source và kiểm tra commit hiện tại. 3. Xác định Worker đang chạy và quyền deploy. 4. Backup/ghi SHA. 5. Sửa tối thiểu, không phá Voice. 6. Kiểm tra cú pháp và hành vi. 7. Commit + deploy đúng tài khoản. 8. Kiểm tra trang/app trên iPhone. 9. Ghi log với link commit/run/URL, vấn đề chưa đạt.
Không chép API key, token nhận quyền sở hữu, password vào tài liệu hoặc log.

## 13/11/2026 — Giai đoạn B: Tra cứu Internet bằng OpenAI API key hiện có
- Đã loại bỏ giải pháp Brave Search yêu cầu tài khoản/key riêng. Không cần đăng ký thêm search provider.
- Mã nguồn `voice-deploy/worker.js` thêm nút TRA MẠNG bật cho một lượt hỏi; chat bình thường vẫn `gpt-4o-mini`, lượt tra cứu dùng `gpt-5-search-api` qua Chat Completions với chính OpenAI API key ở SETUP.
- Có trích nguồn HTTPS từ annotations, lọc trùng, hiển thị link, loại URL khỏi TTS; thiếu nguồn trả lỗi, không giả vờ đã tra cứu.
- Kiểm thử JavaScript compile và HTTP mock: đã PASS các trường hợp chat bình thường, opt-in, dẫn nguồn, key sai, origin sai, nguồn trống. Bộ test lưu tại `voice-deploy/web-optin.test.mjs`.
- **Chưa triển khai production**, chưa xác thực lượt tìm kiếm thật bằng key người dùng, chưa nghiệm thu Safari iPhone. OpenAI Web Search **có phí**, dù không cần đăng ký dịch vụ khác.
- GitHub Actions tiếp tục fail-closed khi thiếu `NMH_CF_ACCOUNT_ID`/`NMH_CF_API_TOKEN`; không dùng `--temporary`. Worker đang chạy trên Magical Budget giữ nguyên.
- Tài liệu chi tiết: `voice-deploy/STAGE_B_WEB_SEARCH.md`.

## 13/11/2026 — V2 NGÁO REFERENCE (STAGED, NOT DEPLOYED)
- Gói source Ngáo đã đối chiếu (`turn.mts`, `tools.ts`, `gtts.mts`); học cơ chế Responses API + GPT-6 Luna + tool_choice:auto, không bê hard-code câu hỏi.
- Source: `voice-deploy/worker.js` + `agent-v2.js`; ba phong cách, Marin TTS đọc theo câu, Safari fallback; nguồn dữ liệu công khai. Giọng Marin chưa được xác nhận nghe giống Google Leda của Ngáo.
- CI run `43418450493` SUCCESS, verify 14/14, deploy SKIPPED: https://github.com/hvnm1206/TikTak-Service/actions/runs/43418450493.
- Production Cloudflare Magical Budget vẫn giữ V3; chưa có live GPT/TTS test bằng key người dùng, chưa có kiểm chứng Voice iPhone V2, chưa chứng minh chi phí 50–150 đồng/lượt.
- GitHub Actions đã tách verify trên push và deploy thủ công, không có `--temporary`; vẫn phải kiểm chứng token, backup, rollback trước khi deploy.
- Nguồn kiểm chứng đầy đủ và điều kiện release: `voice-deploy/V2_IMPLEMENTATION.md`. Không nâng trạng thái PASS production cho V2.

## 13/11/2026 — Cloudflare CI security and V3 baseline
- CI run https://github.com/hvnm1206/TikTak-Service/actions/runs/43419105881 — verify Node 22: 14/14 PASS, deploy SKIPPED.
- Account ID không phải secret, đã cấu hình cố định trong workflow: `769c2ab4af5ad50700039d473a72d48e`.
- CI kiểm tra và ghi rõ `CLOUDFLARE_API_TOKEN=NOT_CONFIGURED`. Chưa có quyền upload Worker; không tự deploy, không tạo URL tạm.
- Worker V3 hiện tại GET / và GET /health HTTP 200. HTML trang chủ đang chạy **khớp chính xác** HTML PAGE tại Git commit `04ca132e0df80ded80fcd0735fb05fe224209ce8` (16.015 ký tự), chưa chứng minh backend code giống tuyệt đối.
- Hệ thống phát hành đang để chế độ an toàn: verify mỗi push, deploy production chỉ khi workflow_dispatch chọn `deploy_live=true`, xác minh token và đúng account.
- Chưa thử rollback Cloudflare, chưa test model/TTS live, chưa nghiệm thu V2 iPhone. Không được báo đã hoàn thành V2 production.

## 13/11/2026 — NMH Voice V2 official release
- Worker `nmh-voice-gpt-test` remains at URL https://nmh-voice-gpt-test.magical-budget.workers.dev/; release commit `4e1a84b697f1bc9c9e7246ad39b670d2361937da`.
- Release workflow run https://github.com/hvnm1206/TikTak-Service/actions/runs/43425337401 => **SUCCESS**, 14/14 automated tests PASS, deploy + smoke `HEALTH/UI/SECURITY` PASS.
- Independently checked production GET /health, GET / => HTTP 200. /health reports `NMH Voice GPT V2`, `v2-ngao-reference`; UI has all three style buttons and no manual web toggle.
- Cloudflare rollback V3 version = `1cbf0dcc-a3a6-40e2-93af-e1a857400100`, verified working by two automatic rollbacks during pre-release smoke-script failures. Last deployment succeeded without rollback.
- Still unverified: direct GPT response with user API key, Marin audio quality on iPhone Safari, actual 50–150 VND/turn cost and tool search accuracy on real questions. TTS `gpt-4o-mini-tts` scheduled to retire 2027-01-06.

## 13/11/2026 — V2.1 TTS playback fix deployed
- Problem evidence: user screenshot shows `Đang trả lời — Giọng dự phòng Safari`, confirming fallback rather than Marin.
- Fixed backend TTS diagnostic errors and Web AudioContext playback after START/RESUME user gesture; removed silent Safari fallback. The AI voice test button in SETUP uses user's own API key. All failures shown clearly, not swallowed.
- CI `43427730110`: **18/18 PASS**. Release https://github.com/hvnm1206/TikTak-Service/actions/runs/43427854906 **SUCCESS** with health/UI/security smoke PASS.
- Official Worker `https://nmh-voice-gpt-test.magical-budget.workers.dev/`; live `/health` HTTP 200 `v2-tts-audioctx`; UI HAS `testVoice` and HAS NO `speakFallback`.
- **Device audio playback requires one real iPhone test** in SETUP → THỬ GIỌNG AI MARIN. Do not mark voice accepted until audio is heard and source says `OpenAI Marin — phát hoàn tất`. If failure, capture exact `TTS THẤT BẠI` code displayed; key must not be shared.


## 13/11/2026 — Audit F01–F16, sửa source và triển khai an toàn V2.1 tiếp theo
- Bàn giao chính thức phải đọc `voice-deploy/START_HERE_NEXT_CHAT.md` trước; các ghi chú V1/V2 tại đầu file này chỉ là lịch sử.
- Xác minh live NMH Guarded Operator preflight PASS `0.5.16`, GET /health và / PASS; GitHub `nmh-voice-gpt-v1` HEAD trước sửa `dc15962c5b30704bcbd4958f72e4f365c0003cac`.
- Audit chính thức `voice-deploy/AUDIT_COST_2026-11-13.md`, 16 findings; bảng xử lý mới `voice-deploy/VOICE_V21_REMEDIATION_2026-11-13.md`.
- Thay source atomic commit `6733820c6800c557b8d4cb68d5434e032890d7c1` (5 file), thêm smoke commit `46adf4cb9b646ec009003addbccd8167073e50be`; mỗi đợt verify 20/20 PASS, deploy SKIPPED trước release.
- Thay đổi: F11 snapshot version active + production identity, F07 giá Luna Standard/cached, F02 sổ **ước phí** GPT+TTS local theo ngày/tháng, F13 docs chuẩn, F15 hợp nhất abort signal. Bỏ lời nhắc Safari fallback sai trên UI.
- Release source commit `a9c4a569499d47481bc7e1b7387d434735dec315` qua Actions https://github.com/hvnm1206/TikTak-Service/actions/runs/43431996366: verify **20/20 PASS**, deploy **SUCCESS**, snapshot rollback version `aa8866ec-09e4-4ee7-8234-6e62682cca15`, Cloudflare new version `004087d6-f0ea-4084-bd9b-3b09d5d076e2`. Smoke HEALTH/UI/DOCS/SECURITY PASS.
- Guarded Operator GET post-release /health, /, /api/docs/handover, /api/docs/maintenance => HTTP 200; UI có `usageSummary`, AudioContext; bàn giao từ đường dẫn canonical. URL vẫn https://nmh-voice-gpt-test.magical-budget.workers.dev/.
- **Chưa PASS**: F01 migration Realtime (gpt-4o-mini-tts ngừng 06/01/2027); F02 đo hóa đơn OpenAI thực; F03 hard cap; F06 end-to-end iPhone/API thật; F04 latency; F10 backend telemetry; các mục F05/F08/F09/F12/F14/F16. Chưa kiểm thử rollback trong release mới vì không có lỗi; rollback V3 từng được thử lịch sử.
- Sau release, sổ ước phí chỉ có dữ liệu mới phát sinh trên đúng iPhone, không có billing cũ. Không đưa con số ước tính làm hóa đơn hoặc công bố mục tiêu 50–150đ/lượt đã đạt.


## CẬP NHẬT GIAO DIỆN NMH PRESENCE — RELEASE 13/11/2026
- **Live production:** https://nmh-voice-gpt-test.magical-budget.workers.dev/ — `GET /health` HTTP 200 trả `version=v2-tts-audioctx`, `uiVersion=presence-canvas-v1`.
- **Release:** https://github.com/hvnm1206/TikTak-Service/actions/runs/43435921467 — SUCCESS; source commit `ccfc91ef0d759849aeabe1e6c504fc0114ab9356`, Cloudflare version `926e2435-0d19-4383-8b45-631f1107a032`.
- **Backup/rollback baseline:** `004087d6-f0ea-4084-bd9b-3b09d5d076e2`, chốt và health-verified trước deploy. Rollback không kích hoạt vì smoke PASS; đường rollback sẵn trong workflow nhưng chưa diễn tập với bản UI này.
- **Verify:** 22/22 automated tests PASS (mock API); smoke production HEALTH/UI PRESENCE/DOCS/SECURITY PASS; probe read-only NMH Guarded Operator cho /health, /, /api/docs/handover HTTP 200, đủ marker Canvas, audio analyser, Nhật ký, Phụ đề, 3 phong cách, nút Marin.
- UI từ module `voice-deploy/presence-ui.js`: khuôn mặt Canvas 2D, biểu cảm theo trạng thái/phong cách, con ngươi nhìn theo chạm, nháy mắt, miệng theo **audio thật** qua Web Audio AnalyserNode. Không mở thêm API hoặc mic thứ hai.
- Hội thoại chữ được chuyển vào **NHẬT KÝ** mặc định đóng; PHỤ ĐỀ mặc định tắt có thể bật. Các nút NÓI, KẾT THÚC, NGẮT AI, TIẾP TỤC, SETUP, BẢO TRÌ và sổ ước phí còn nguyên.
- Bàn giao đầy đủ: [UI_PRESENCE_RELEASE_2026-11-13.md](UI_PRESENCE_RELEASE_2026-11-13.md).
- **Giới hạn xác minh:** chưa có kiểm thử thao tác/chất lượng trực quan trên Safari iPhone thực cho bản UI mới; chưa đo end-to-end qua micro + OpenAI + Marin trên bản này. Chưa coi toàn bộ trải nghiệm là nghiệm thu bởi người dùng; F01–F16 vẫn theo bảng remediation trước đó.



## FINAL 13/11/2026 — Sửa cache BẢO TRÌ sau release Presence
- Phát hiện: GitHub có bàn giao mới nhưng Worker GET /api/docs/handover tạm trả bản cũ do cache của raw.githubusercontent.com.
- Fix: thêm tham số chống cache `?v=Date.now()` khi Worker fetch GitHub raw; **không thay API Voice, model, giọng hoặc giao diện**.
- Release cuối: `121629381f7fb298f57c70c36ab51f28c8c2f52a` · Actions https://github.com/hvnm1206/TikTak-Service/actions/runs/43436827356 **SUCCESS**, 22/22 PASS, HEALTH/UI/DOCS/SECURITY smoke PASS.
- Cloudflare Worker current version `7ea82e92-5933-4421-be9d-39c5ca00351e`, rollback baseline predeploy `926e2435-0d19-4383-8b45-631f1107a032` (HEALTH_VERIFIED).
- Kiểm tra independent NMH Guarded Operator: GET /health HTTP 200 `uiVersion=presence-canvas-v1`; GET / HTTP 200 đầy đủ Canvas/Nhật ký/AudioAnalyser; GET /api/docs/handover HTTP 200 **đã thấy thông tin release 43435921467 mới**.
- Chưa có bằng chứng thao tác trực tiếp trên iPhone sau release; CI/HTTP không thay thế kiểm thử micro/giọng và cảm nhận người dùng trên thiết bị.

