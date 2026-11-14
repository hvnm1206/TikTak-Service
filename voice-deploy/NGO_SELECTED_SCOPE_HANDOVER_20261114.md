# NGỐ / NMH VOICE GPT — PHẠM VI CHỌN LỌC & BÀN GIAO THỰC THI
Ngày chốt: 14/11/2026 (Asia/Ho_Chi_Minh)
Trạng thái văn bản: ĐÃ CHỐT PHẠM VI + LƯU BÀN GIAO. CHƯA THỰC HIỆN CÁC NÂNG CẤP MỚI TRONG VĂN BẢN NÀY.
Chủ dự án: người dùng. Tên sản phẩm: NGỐ (NMH Voice GPT). NGÁO chỉ là nguồn tham khảo đọc.

## A. QUY TẮC NGUỒN SỰ THẬT — ĐỌC ĐẦU TIÊN
1. Tab BẢO TRÌ của Worker đang đọc các URL /api/docs/handover và /api/docs/maintenance từ NHÁNH TÀI LIỆU nmh-voice-gpt-v1:
   - GitHub: https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-gpt-v1/voice-deploy/START_HERE_NEXT_CHAT.md
   - GitHub: https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-gpt-v1/MAINTENANCE.md
   - Nội dung trong hai file này có nhiều mốc lịch sử CŨ, không được lấy tiêu đề 51bd4dde ngày trước làm version production hiện tại. Đọc MỤC CẬP NHẬT NGỐ ở đầu file và tài liệu này trước khi làm.
2. Mã đã dùng cho NGỐ mới ở nhánh: nmh-voice-memory-v2-stage-20261114; KHÔNG lấy mã cũ của nhánh nmh-voice-gpt-v1 làm nền để triển khai mới.
   - https://github.com/hvnm1206/TikTak-Service/tree/nmh-voice-memory-v2-stage-20261114/voice-deploy
   - Lần release sửa lệnh ghi: GitHub Actions https://github.com/hvnm1206/TikTak-Service/actions/runs/43569160880
   - Worker version xác minh sau release: fb2bacc5-b26e-4abc-9ee1-78cc222ac221. Đây là MỐC ĐỐI CHIẾU NGÀY 14/11, không được mặc định là version đang chạy vào ngày khác: gọi Cloudflare API và health trước mọi công việc.
   - Smoke test thật qua API production bằng dữ liệu thử đã dọn sạch: https://github.com/hvnm1206/TikTak-Service/actions/runs/43569516448 ; không đồng nghĩa đã test mic thực tế trên iPhone.
3. Cloudflare tài nguyên NGỐ: Account 769c2ab4af5ad50700039d473a72d48e; Worker nmh-voice-gpt-test; URL https://nmh-voice-gpt-test.magical-budget.workers.dev/ ; D1 binding NMH_DB, database nmh-voice-v3, UUID 3ce295cb-a84d-4a50-abee-d14fdd903514.
4. Code chính phải đọc trước khi sửa:
   - voice-deploy/worker.js (Worker + HTML Voice + route /api/chat, /api/tts, /health; ghép BẢO TRÌ)
   - voice-deploy/agent-v2.js (Responses API, get_current_time, get_weather, search_encyclopedia, search_news, web_search)
   - voice-deploy/v3-backend.js (Google session, profile, D1 memories, documents, voice note, đọc context)
   - voice-deploy/v3-ui.js (SETUP: đăng nhập, memory, docs)
   - voice-deploy/voice-write.js (nhận lệnh ghi, phân loại và trả lời sau D1 readback)
   - voice-deploy/memory-v2.js (Memory V2 opt-in)
   - voice-deploy/migrations/{0001_v3.sql,0002_v3_d1_only.sql,0003_memory_v2.sql}
   - Các file *.test.mjs liên quan, .github/workflows/nmh-memory-v2-stage.yml và nmh-memory-v2-prod-pilot.yml.
5. Tính năng đã có và PHẢI GIỮ: micro/SpeechRecognition trên iPhone, cuộc gọi chat GPT, Marin TTS, Web Search, Google OAuth, D1 dữ liệu và quyền theo subject, Memory V2 bật/tắt, GHI_CHU.md, prompt cá nhân, tài liệu TXT/MD, Presence/canvas, quản lý key trong SETUP, BẢO TRÌ, chi phí và kiểm thử API.
6. NGÁO: tuyệt đối KHÔNG sửa code, deploy, cấu hình, dữ liệu, tài khoản, hạ tầng; chỉ tham khảo từ gói ngao-ban-giao.zip của cuộc hội thoại trước, nếu có quyền đọc. Các file đọc tham khảo: ngao/BAN_GIAO_CHO_GPT.md; ngao/src/voice/{tools.ts,remind.ts,memoryCore.ts}; ngao/netlify/functions/turn.mts. Gói này KHÔNG được coi là mã nguồn NGỐ, không đưa vào nhánh NGỐ. Nơi đã có phân tích nguồn: bản audit 14/11/2026 trong hội thoại này. Bàn giao bên dưới TỰ ĐỦ để triển khai NGỐ nếu không còn ZIP.

## B. QUYẾT ĐỊNH CHỌN HẠNG MỤC — LÀM ÍT NHƯNG DỨT ĐIỂM
CHỐT BA HẠNG MỤC TƯƠNG THÍCH CÔNG CỤ HIỆN CÓ; NGHIỆM THU TỪNG MỐC:
P0-1. HỆ THỐNG ACTION/TOOL có hợp đồng: GPT nhận lệnh, backend validate/execute/đọc lại/ACK. Chặn lời nói "đã làm" khi chưa có bằng chứng; không còn từ chối "không có công cụ" cho action có hỗ trợ.
P0-2. NHẮC VIỆC NGAY TRONG APP: "2 phút nữa nhắc tao uống thuốc" -> tạo reminder D1 theo Google subject, xác nhận THỜI ĐIỂM sau readback, khi TAB ĐANG MỞ ứng dụng phát thông báo và lời nhắc đúng một lần; lệnh xem/hủy; xử lý reload, trùng, lệch giờ, không đăng nhập, mất mạng.
P0-3. NHẬT KÝ ACTION & CHỐNG HỒI QUY: luồng trace có ID và trạng thái lưu thành công/thất bại; unit/integration/sandbox/native D1/production smoke; khóa backup/rollback; bảo toàn STT, Marin và Search.
ƯU TIÊN THỰC THI: đóng cổng P0-1 + P0-3 trước, rồi P0-2; không gộp với thay đổi audio engine.

KHÔNG NHẬN TRIỂN KHAI TRONG ĐỢT NÀY:
- VAD/audio capture mới, barge-in/nói chen, streaming LLM/TTS: đều có rủi ro làm hỏng mic và không thể nghiệm thu chỉ bằng CI. Đánh giá ở đợt sau.
- Web Push khi app đóng/khóa màn hình, Native iOS local notification, nhắc khi Safari không hoạt động: KHÔNG cam kết trong P0-2. Cần PWA, Service Worker, quyền người dùng, cơ chế push tin cậy và test iPhone riêng.
- Đổi tên, biểu cảm mắt, 54 clip, kho luật giao thông: không phải mục tiêu vận hành hiện tại. Kho luật tham khảo từ Ngáo có lỗi đã biết, không sao chép.
- Không nhập dữ liệu Ngáo, không thu/copy API key người dùng, không gửi nội dung sức khỏe vào log.
- Thời gian nhắc uống thuốc là tính năng tiện ích, KHÔNG coi là hệ thống cảnh báo y tế bảo đảm; không cam kết nếu app bị đóng, tắt âm thanh, mất mạng, hệ điều hành treo timer.

## C. HỢP ĐỒNG KỸ THUẬT MỤC TIÊU
### C1. Action Router — incremental, không đại tu luồng Voice
- Thêm module MỚI ở voice-deploy (tên dự kiến action-registry.js, reminders.js, reminders-client.js; tên cuối do kỹ thuật chọn có bằng chứng).
- Một action đăng ký name, JSON schema, owner scope, authorization policy, validate, execute, idempotency, readback, display ACK, audit status. Tách AI "đề xuất action" khỏi code "thực hiện action".
- Ưu tiên function calling/structured output của Responses API do agent-v2.js đã có. Chỉ gọi tool được bật. Không thêm regex vá theo từng lời nói. Khi không chắc chắn về thời gian/nội dung, ASK/CLARIFY hoặc FAILED; tuyệt đối không tự tính giờ sai.
- Giai đoạn đầu chỉ thêm set_reminder, list_reminders, cancel_reminder. Giữ voice-write.js và nhánh note/memory cũ hoạt động, KHÔNG di chuyển chúng cùng lúc; tái sử dụng ActionRegistry sau khi reminder ổn định.
- Với mọi action thay đổi dữ liệu: REQUESTED → VALIDATED → EXECUTED → READBACK VERIFIED → ACK_SAVED/ACK_FAILED. Không nói "đã đặt" trước readback. Không cho LLM tự viết ACK thành công.
- Google session bắt buộc cho D1 cross-device; thiếu login phải nói CHƯA ĐẶT và giải thích đăng nhập. Dedupe theo requestId + Google subject và trạng thái.
- Nếu API/DB/công cụ lỗi, không fallback sang chat tự bịa kết quả. Một lượt vẫn phải có answer rõ: "Chưa đặt được nhắc việc vì ...".

### C2. Reminder V1 — giới hạn CHỈ KHI APP ĐANG MỞ
- D1 migration CỘNG THÊM (dự kiến 0004_reminders.sql). Bảng mới owner user_id, reminder id, text, due_at_utc_ms, timezone=Asia/Ho_Chi_Minh, status=pending/triggered/canceled, created_at, updated_at, idempotency_key. Thêm audit ledger nếu cần; không ALTER/drop bảng V3 cũ.
- Lệnh: "2 phút nữa nhắc tao uống thuốc", "8 giờ tối nhắc họp", "đang có những lời nhắc nào", "hủy lời nhắc ...". GPT chọn đúng tool; backend dùng thời gian chuẩn server, xác định timezone và độ trễ; từ chối yêu cầu không rõ, thời điểm đã qua không có quy tắc rõ hoặc độ dài bất thường.
- Khi app đang foreground, client polling/scheduler định kỳ lấy lời nhắc đến hạn (không dựa vào một setTimeout 2 phút duy nhất). Reload vẫn nạp được pending D1. Multi-tab/device dùng claim nguyên tử ở D1 để chỉ một phiên có quyền phát. Có chính sách hiển thị nhắc quá hạn khi trở lại app. Mọi thao tác acknowledge từ server.
- Chỉ dùng UI và audio hiện có; KHÔNG thay STT engine, mic lifecycle, TTS provider. Có thể phát Marin qua API TTS đang dùng khi user key đã hợp lệ, bằng cách bật lại audio theo các ràng buộc gesture của iOS; nếu autoplay bị chặn thì PHẢI hiện thông báo rõ và cho nút phát; không tuyên bố đã phát giọng nếu không có playback ACK.
- Một câu "Đã đặt nhắc 14:53:00, nhắc uống thuốc; lời nhắc chỉ phát khi Ngố đang mở" chỉ được tạo sau xác nhận D1. Không có session/permission -> "Chưa đặt".
- Tuyệt đối không lưu thông tin loại thuốc, chẩn đoán, sức khỏe cá nhân vào log chung. Payload reminder trong D1 chỉ theo owner và tối thiểu cần thiết.

### C3. Quan sát + thất bại kiểm chứng được
- Log tối thiểu eventId, actionName, user pseudonym/hash hoặc opaque ID, elapsedMs, phase, errorCode, database row id, ACK status; KHÔNG log apiKey, nội dung lời nói, cookie, JWT, ghi nhớ/tài liệu, thông tin y tế. Retention có giới hạn.
- Thêm health capability marker riêng và trạng thái reminder module, không sửa health cũ. Đặt feature flag mặc định OFF đến khi qua staging.
- BẢO TRÌ / bàn giao cập nhật mỗi cổng, ghi rõ version, commit, Actions run, DB migration, backup, flag, lỗi còn lại và cách rollback.

## D. NGHIỆM THU KHÔNG ĐƯỢC HẠ CHUẨN
Gate 0. Read-only preflight: kiểm tra quyền GitHub, Guard/Operator, Cloudflare token, CI, D1; so sánh exact deployed Worker version từ Cloudflare API; lập checkpoint Time Travel D1 + target Worker rollback; đọc mã hiện hữu và docs trước khi viết.
Gate 1. Implementation ở NHÁNH MỚI TỪ nhánh đang khớp production/stage; không sửa branch cũ nhầm. Thêm code, migration additive, kill switch; không deploy production.
Gate 2. Tests: câu đúng/không rõ thời gian, timezone, giờ qua ngày, trùng lệnh, hủy, nhiều tab, refresh, 0/1/n pending, lỗi database, không auth, API 429/403, abort, iPhone TTS bị chặn, khôi phục; regressions STT/Marin, GPT, Web Search, memory, docs, OAuth, Setup, maintenance. Không chấp nhận pass giả lập thay cho D1 thật.
Gate 3. Sandbox Cloudflare Worker + D1 riêng: test transaction claim/dedupe/readback, lỗi và hồi phục, test synthetic user D1 đã dọn sạch, chứng cứ link CI. Nếu Guard/Token không cho phép, tìm đường Operator khả thi, không tùy tiện bỏ test.
Gate 4. Pilot production 1 user: verify preflight version, time travel backup, deploy đúng Worker nhờ GitHub Actions / Wrangler, không thay URL; rollback có bằng chứng. 2 phút, 5 phút, list/cancel, F5, multi-tab: PASS. Đọc lại D1 thật, ACK chính xác. Test âm thanh khi foreground iPhone thật; nếu không có quyền thiết bị, báo NOT VERIFIED cho cổng đó, không tuyên bố đã nghiệm thu toàn bộ.
Gate 5. Hậu triển khai: health / config / maintenance đều 200, các voice tests + existing regression PASS. Tắt flag hoặc rollback nếu mic/Marin/web/doc lỗi; không rollback schema bằng DROP, không đụng dữ liệu cũ.
Định nghĩa DONE: ghi kết quả thực nghiệm theo test case, URLs, run IDs, response evidence; lời nhắc foreground đúng một lần khi app mở, ACK có bằng chứng, không mất chức năng cũ. Chưa có kiểm thử iPhone thì chỉ nhận kỹ thuật API/backend, không nhận toàn bộ trải nghiệm.

## E. CÁCH TIẾP CẬN CÔNG CỤ
- GitHub connector: fetch_file, create_branch, create_file, update_file, compare_commits, fetch_workflow_run_jobs, fetch_workflow_job_logs.
- NMH Operator hoặc Guarded Operator: preflight runtime, GET health/config, kiểm chứng an toàn; tuân thủ guard khi user yêu cầu.
- GitHub Actions: các workflow hiện có có secret names NMH_CF_API_TOKEN, NMH_V3_CF_PROVISION_TOKEN, NMH_V3_GOOGLE_CLIENT_ID; không đọc hoặc hiển thị giá trị secret.
- Chỉ dùng GitHub branch/workflow, Cloudflare Worker và D1 của NGỐ. Không kết nối hay cập nhật hệ thống NGÁO.
- Production không phải nhánh nmh-voice-gpt-v1: nhánh này là NGUỒN TÀI LIỆU cho tab BẢO TRÌ. Phải đối chiếu version deploy và git SHA, tránh triển khai source cũ ghi đè tính năng mới.
- ĐỪNG tự tạo một loạt workflow hoặc database thừa nếu có sẵn đường triển khai an toàn; dùng resource mới chỉ khi thực sự cần test cách ly, kèm cleanup evidence.

## F. NGUỒN LỊCH SỬ ĐÃ KIỂM CHỨNG
- 14/11 baseline Voice Memory V2 + lưu đồng bộ: Actions https://github.com/hvnm1206/TikTak-Service/actions/runs/43569160880
- 14/11 API trực tiếp trên production (tài khoản giả lập được xóa): https://github.com/hvnm1206/TikTak-Service/actions/runs/43569516448
- 14/11 production read-only D1: https://github.com/hvnm1206/TikTak-Service/actions/runs/43571238169 — tại thời điểm đó có 4 memories, 2 lượt memory V2, 1 file ghi chú; không được diễn giải là từng câu nói gần nhất đều đã lưu.
- 14/11 Memory V2 sandbox + native D1: https://github.com/hvnm1206/TikTak-Service/actions/runs/43564162174
- Audit tham khảo Ngáo (bản theo ZIP v0.12.2): có dat_nhac ở src/voice/remind.ts + tools.ts, phát lời nhắc khi app mở; gói chưa chứng minh background iPhone hoặc local notification khi app đóng. Không được coi các nhận xét trong ZIP là dữ liệu live đã xác minh.
- Các URLs tài liệu chi tiết của NGỐ hiện tại: https://github.com/hvnm1206/TikTak-Service/tree/nmh-voice-memory-v2-stage-20261114/voice-deploy

## G. ĐẦU RA BẮT BUỘC CỦA CỬA MỚI
1. Thực thi P0-1, P0-3 và P0-2 theo Gate 0→5, không dừng ở lời giải thích/kế hoạch nếu công cụ còn khả thi.
2. Lưu mã đã kiểm thử, test report và changelog trong GitHub, cập nhật BẢO TRÌ mà không vượt giới hạn 60.000 ký tự hoặc làm lỗi endpoint /api/docs/maintenance.
3. Báo rõ: ĐÃ SỬA GÌ? BẰNG CHỨNG Ở ĐÂU? ĐẠT TEST NÀO? ĐÃ TRIỂN KHAI CHƯA? CÒN GIỚI HẠN GÌ?
4. Nếu hạ tầng đã thay đổi, dừng các thao tác ghi nguy hiểm khi chưa đối chiếu lại; không hứa thực thi ngầm hay xin cùng thông tin đã có.
5. Không tự mở rộng phạm vi sang VAD/streaming/nhận dạng hình ảnh/Ngáo mà chưa có mục tiêu và bằng chứng.

***Văn bản này là quyết định và bàn giao thực thi, không phải biên bản đã hoàn thành tính năng mới.***
