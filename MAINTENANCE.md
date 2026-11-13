# NMH VOICE GPT — BẢO TRÌ / NHẬT KÝ KỸ THUẬT
**Chốt cập nhật: 13/11/2026.** Đây là phần tổng hợp hiện trạng *mới nhất*, phải đọc trước các bản ghi V1/V2 cũ bên dưới. Mọi kết luận quan trọng phải đối chiếu source, GitHub Actions và Worker thực tế.

## A. HIỆN TRẠNG ĐANG CHẠY — NMH PRESENCE V2.1

### 1. Nền tảng, quyền và phiên bản
- URL chính thức: https://nmh-voice-gpt-test.magical-budget.workers.dev/ (giữ nguyên URL cũ trên iPhone).
- Cloudflare account: **Magical Budget**; Account ID `769c2ab4af5ad50700039d473a72d48e`; Worker `nmh-voice-gpt-test`. Không tạo Worker temporary.
- GitHub `hvnm1206/TikTak-Service`, chỉ cập nhật nhánh `nmh-voice-gpt-v1`, không động `main`.
- **Production đang chạy sau sửa đồng bộ tài liệu:** Cloudflare version `e6cb6c6d-064c-413e-8a12-93cf4873fa00`; source release commit `a96d4d795e7eb0e23faaa6cb58c90a9a8c5e9afd`. [Actions run 43439620111](https://github.com/hvnm1206/TikTak-Service/actions/runs/43439620111): **SUCCESS**, CI **24/24 PASS**, smoke HEALTH / UI PRESENCE / DOCS mới nhất / SECURITY **PASS**. Release Presence trước đó: [43436827356](https://github.com/hvnm1206/TikTak-Service/actions/runs/43436827356), version `7ea82e92-5933-4421-be9d-39c5ca00351e`.
- Rollback baseline trước release gần nhất: `7ea82e92-5933-4421-be9d-39c5ca00351e` được xác nhận **HEALTH_VERIFIED**. Workflow có đường `wrangler rollback` nếu lỗi; chưa có bằng chứng diễn tập rollback của đúng bản Presence hiện hành, do release đạt smoke.
- GitHub HEAD được đối chiếu trước cập nhật bảo trì: `911bde3f4cd9365d27c4ef2ee1ab718f1fddbdf1` (commit tài liệu, **không phải** version triển khai). Actions `43437150330` verify SUCCESS, deploy SKIPPED.
- NMH Guarded Operator preflight `0.5.16`: PASS. Đã trực tiếp kiểm tra `GET /health`, `GET /`, `GET /api/docs/maintenance` và cả ba trả **HTTP 200**.
- Health xác thực: `ok=true`, `app=NMH Voice GPT V2`, `voice=browser-stt+marin-tts`, `agent=gpt-6-luna`, `version=v2-tts-audioctx`, `uiVersion=presence-canvas-v1`. Trang chính có các marker `avatar`, `journalBtn`, `subsBtn`, `getByteTimeDomainData`.

### 1b. Đồng bộ tài liệu BẢO TRÌ sau lần cập nhật này
- File `MAINTENANCE.md` được cập nhật đầy đủ trên GitHub commit `e79913ba4cce262fc63ce64de929e389bbad0815` (20.893 ký tự, giữ lịch sử cũ). GitHub Contents API và Raw đều xác nhận có phần tổng hợp A và F01–F16.
- Phát hiện: sau khi commit tài liệu, Worker `/api/docs/maintenance` còn trả bản cũ 12.302 ký tự dù HTTP 200. Đã thay nguồn đọc từ GitHub Raw CDN sang GitHub Contents API (UTF-8/base64), bổ sung test Unicode, payload base64 có xuống dòng, lỗi trả 502 thay vì giả vờ tài liệu mới.
- CI `43439488614` **24/24 PASS** trước release. Release `43439620111` smoke xác minh **bản bảo trì mới** (`DEPLOY_DOCS=CANONICAL_AND_CURRENT_OK`) và không thay STT/GPT/TTS/Face.
- **Bằng chứng live bổ sung:** sau release, probe độc lập `GET /api/docs/maintenance` từng trả **HTTP 502** (chưa xác định được lỗi mạng/API GitHub), lần kiểm tra sau trả **HTTP 200** và đúng phần A bản mới. Vì vậy **không khẳng định đường đọc tài liệu ổn định tuyệt đối** nếu chưa đo lặp lại; sự cố HTTP 502 đã ghi nhận để tiếp tục điều tra, không đánh dấu resolved.
- Nội dung bên trong ứng dụng lấy trực tiếp từ GitHub nên commit chỉ sửa tài liệu `MAINTENANCE.md` tiếp theo **không cần deploy Worker**. Sau update phải kiểm tra app thực tế trả phiên bản mới; không lấy HTTP 200 đơn lẻ làm bằng chứng cập nhật thành công.

### 2. Giao diện NMH Presence — đã phát hành
- **Thay chat chữ chính bằng khuôn mặt điện tử Canvas 2D**. Khuôn mặt có mắt, con ngươi, nháy mắt, hướng nhìn khi chạm và vòng sáng theo trạng thái `idle/listening/processing/speaking/paused/error`.
- Ba tính cách **ĐANH ĐÁ / CHÉM GIÓ / NGHIÊM TÚC** có màu và biểu cảm riêng. UI được vẽ hoàn toàn trên điện thoại; **không có API tính phí bổ sung để tạo biểu cảm**, không có micro thứ hai.
- Chuyển động miệng trong giai đoạn phát âm thanh dùng dữ liệu MP3 đang phát qua Web Audio `AnalyserNode.getByteTimeDomainData`. Vòng sáng khi nghe là tín hiệu trạng thái, **không phải đo cường độ microphone thật**.
- Hội thoại chữ được đưa vào **NHẬT KÝ**, mặc định đóng; **PHỤ ĐỀ** mặc định tắt và có thể bật. Nội dung hội thoại vẫn được sử dụng làm ngữ cảnh trong phiên, không xóa chức năng trả nguồn.
- Bảo toàn NÓI / KẾT THÚC / NGẮT AI / TIẾP TỤC, 3 phong cách, SETUP, BẢO TRÌ, THỬ GIỌNG AI MARIN, API key tự nhập và sổ ước phí.
- Cấu trúc source: `voice-deploy/worker.js` (Worker/API, nhúng trang), `voice-deploy/presence-ui.js` (Canvas và UI), `voice-deploy/agent-v2.js` (GPT + tools), `voice-deploy/wrangler.jsonc`, `.github/workflows/nmh-voice-preview.yml`, `worker-v2.test.mjs`, `agent-v2.test.mjs`.
- Tư liệu tham khảo do người dùng cung cấp: mã **Ngáo v0.6** (`src/face/engine.ts`, `src/App.tsx`). NMH Presence là module riêng cho Worker hiện hữu, không bê nguyên React/Ngáo.
- Release giao diện lần đầu: commit `ccfc91ef0d759849aeabe1e6c504fc0114ab9356`, [Actions 43435921467](https://github.com/hvnm1206/TikTak-Service/actions/runs/43435921467) SUCCESS, version `926e2435-0d19-4383-8b45-631f1107a032`. Bản hiện hành sau đó xử lý cache tài liệu BẢO TRÌ.
- **Phản hồi người dùng đã nhận:** “Tao thấy khá tốt đấy”. Đây là **đánh giá tích cực ban đầu về giao diện**, chưa phải biên bản nghiệm thu tất cả thao tác, chất lượng giọng, độ trễ hay E2E trên iPhone.

### 3. Giọng nói, tìm kiếm, bảo mật và chi phí
- STT: Web SpeechRecognition của Safari; agent `gpt-6-luna` qua Responses API; TTS hiện thời `gpt-4o-mini-tts` giọng `marin` phát bằng AudioContext. Nếu Marin lỗi báo rõ, không tự động chuyển sang Safari fallback.
- Tools công khai: giờ, Open-Meteo, Wikipedia tiếng Việt, Google News RSS. **Không phải tìm kiếm toàn bộ Internet**.
- API key do người dùng điền SETUP, có lựa chọn lưu `localStorage` hoặc chỉ giữ phiên; không sao chép key vào GitHub, log hay tài liệu. Rủi ro localStorage còn mở.
- Sổ **ước phí** GPT + TTS được lưu trên chính thiết bị: GPT theo usage/cached tokens, TTS theo thời lượng audio đã giải mã và mức giả định 0,015 USD/phút. Không có dữ liệu hóa đơn OpenAI thực, audio token billed, hoặc budget cap đã kiểm chứng.
- Mục tiêu chi phí **50–150 VND/lượt chưa được nghiệm thu**; không được dùng bảng dự báo làm báo giá/chi tiêu thực tế.

### 4. Audit F01–F16 — trạng thái đến thời điểm bàn giao
| ID | Trạng thái | Tiêu chí còn thiếu |
|---|---|---|
| F01 | **MỞ / P0** | TTS model cũ theo tài liệu audit ngừng 06/01/2027; cần chuyển tuyến mới, test Marin/độ trễ/chi phí thật. Không chỉ thay tên model vào `/v1/audio/speech`. |
| F02 | **MỘT PHẦN** | Có ước phí local; thiếu đo TTS billed usage và đối soát Usage/Costs thực theo lượt. |
| F03 | **MỞ** | Budget cap và cảnh báo chi phí được kiểm chứng. |
| F04 | **MỞ** | Tối ưu pipeline các chunk TTS, đo độ trễ trước/sau. |
| F05 | **MỞ** | Mở rộng web search có nguồn, độ phủ và kiểm soát phí. |
| F06 | **MỞ / P0** | Test iPhone thật: micro → STT → GPT → TTS Marin → phát → nghe lượt sau; dừng/ngắt/tiếp tục. |
| F07 | **SỬA/CI PASS** | Công thức giá GPT Standard short/cached đã sửa; vẫn cần đối chiếu hóa đơn. |
| F08 | **MỞ** | Đo `speed=0.756` và `playbackRate=1.455` đối với audio token/phí/giọng. |
| F09 | **MỞ** | Rà soát nguy cơ lưu key localStorage trên thiết bị chia sẻ. |
| F10 | **MỞ** | Observability và telemetry tối thiểu an toàn trên Worker. |
| F11 | **ĐÃ DEPLOY** | Lấy snapshot active + health/identity trước deploy; chưa diễn tập rollback với bản hiện hành. |
| F12 | **MỞ** | Kiểm tra điều khoản Open-Meteo và điều kiện thương mại. |
| F13 | **ĐÃ DEPLOY** | BẢO TRÌ đọc tài liệu chuẩn, sửa cache GitHub raw, không hứa fallback sai. |
| F14 | **GIỚI HẠN ĐÃ NÊU** | Safari chuyển nền/khóa màn hình phải tiếp tục thủ công; chưa xử lý kiến trúc. |
| F15 | **MỘT PHẦN** | Có kết hợp tín hiệu abort cho Responses API; chưa tối ưu timeout/retry mọi tool. |
| F16 | **MỞ** | Geocoding địa danh trùng và RSS parser chưa đủ chắc chắn. |

**Thứ tự ưu tiên còn mở:** F01 + F06 + F03; tiếp đến F02 + F04 + F08; rồi F10 + F15 và các mục còn lại. Độ ưu tiên không đồng nghĩa với xác nhận đã làm xong.

### 5. Phương pháp phát hành và nghiệm thu bắt buộc
1. Xác minh HEAD, source, Cloudflare active version; phân biệt commit tài liệu và deployed Worker. Không sửa `main`, không dùng `wrangler deploy --temporary`, không tự tạo URL.
2. Giữ các chức năng Voice, SETUP, BẢO TRÌ; test syntax và đầy đủ regression (CI mock không thay thế test API thật).
3. Chốt active version/health làm snapshot rollback. Deploy qua GitHub Actions vào **cùng Worker**; smoke health, Presence Canvas, Nhật ký, Phụ đề, TTS controls, docs và key sai.
4. Nếu fail phải xác minh trạng thái rollback; không công bố thành công chỉ vì workflow có sẵn lệnh rollback.
5. Khi nghiệm thu iPhone cần kiểm micro, chất giọng, từng trạng thái và thao tác. Khi nghiệm thu chi phí cần OpenAI Usage/Costs. Phản hồi “khá tốt” chỉ xác nhận cảm nhận ban đầu.
6. Sau mỗi lần sửa cập nhật `MAINTENANCE.md` và điểm bàn giao `voice-deploy/START_HERE_NEXT_CHAT.md` nếu thay đổi trạng thái. BẢO TRÌ trong app phải tải được nội dung mới. Không ghi key, audio hay dữ liệu nhạy cảm.

### 6. Bằng chứng và đường dẫn
- [Worker production](https://nmh-voice-gpt-test.magical-budget.workers.dev/) · [Live health](https://nmh-voice-gpt-test.magical-budget.workers.dev/health)
- [Release đang chạy 43436827356](https://github.com/hvnm1206/TikTak-Service/actions/runs/43436827356) · [Tài liệu giao diện Presence](https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-gpt-v1/voice-deploy/UI_PRESENCE_RELEASE_2026-11-13.md)
- [Bàn giao chính thức](https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-gpt-v1/voice-deploy/START_HERE_NEXT_CHAT.md)
- [Audit gốc](https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-gpt-v1/voice-deploy/AUDIT_COST_2026-11-13.md) · [Remediation F01–F16](https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-gpt-v1/voice-deploy/VOICE_V21_REMEDIATION_2026-11-13.md)

---

## B. NHẬT KÝ LỊCH SỬ — GIỮ ĐỂ TRUY VẾT

**Lưu ý:** Các mô tả “V2 chưa triển khai”, “Cloudflare chưa có token” hoặc “Worker temporary” bên dưới là bản ghi tại các mốc cũ, **không phải** hiện trạng hiện nay. Khi có mâu thuẫn, dựa trên phần A và nguồn live.

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

