# NMH VOICE GPT — BẢO TRÌ / NHẬT KÝ KỸ THUẬT

## CHỐT CUỐI CÙNG 14/11/2026 — NGỐ VOLUME + MASCOT LAYOUT HOTFIX PRODUCTION PASS
- Trạng thái mới nhất: Worker chính `nmh-voice-gpt-test`, URL **https://nmh-voice-gpt-test.magical-budget.workers.dev/**, version **`253c198a-5af6-4a98-9776-ebe9b06aa424`**.
- Sau release audio/theme version `cd66b9f6-b7a7-4970-abf8-ce1ef19e1446`, source audit phát hiện mascot Vịt/Corgi bị chèn vào vùng chú thích gây trùng avatar. Đã sửa: mascot vào `.visual-field`, ẩn canvas cũ CHỈ khi chọn vịt/corgi, chế độ Mặc định giữ nguyên NMH Presence. Không đổi logic mic/TTS.
- Regression **71 legacy + 20 new PASS**. Sandbox Cloudflare D1/rollback hotfix: https://github.com/hvnm1206/TikTak-Service/actions/runs/43580057061 — SUCCESS. Production release hotfix: https://github.com/hvnm1206/TikTak-Service/actions/runs/43580162153 — SUCCESS, exact pinned source, D1 bookmark, smoke, rollback gate PASS.
- Version rollback trực tiếp từ bản hotfix: `cd66b9f6-b7a7-4970-abf8-ce1ef19e1446`. Nếu muốn rollback cả audio/theme về P0 ban đầu thì dùng version `08e0bbf2-a2e5-4b98-94dc-0cfee882e5b6`. Không đảo ngược D1; migration trước đó cộng bảng, hotfix không sửa D1.
- Independent Guarded Operator sau hotfix: GET /health HTTP 200, /api/reminders/capabilities HTTP 200 active. URL và tính năng cũ vẫn giữ.
- GIỚI HẠN: chưa nghiệm thu âm lượng nghe thực tế trên iPhone, theme layout Safari và lời nhắc audio trên iPhone. Người dùng sẽ tự thử. Không công bố thiết bị PASS nếu chưa có bằng chứng.
- Không chạm Ngáo. Các phiên bản `cd66...` và cũ ghi dưới là lịch sử, không phải version production hiện tại.


## CẬP NHẬT MỚI NHẤT 14/11/2026 — NGỐ ĐÃ NÂNG ÂM LƯỢNG + GIAO DIỆN TRÊN PRODUCTION
- URL chính thức giữ nguyên: https://nmh-voice-gpt-test.magical-budget.workers.dev/ . Worker version: `cd66b9f6-b7a7-4970-abf8-ce1ef19e1446`.
- Nguồn: nhánh `nmh-voice-actions-reminders-p0-20261114`; kế hoạch bám sát: https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-actions-reminders-p0-20261114/voice-deploy/NGO_AUDIO_THEME_PLAN_20261114.md .
- Giọng Marin: thanh tăng âm trong SETUP, gain 1.00–2.50, mặc định 1.55; WebAudio `Analyser (avatar cũ) → Gain → Compressor → loa`; giữ nguyên mic và NMH Presence meter.
- Giao diện SETUP: Mặc định/Vịt Ngố/Corgi Ngố. SVG mascot tự vẽ + trạng thái nghe/nghĩ/nói, chỉ lớp giao diện, không sửa GPT/Marin/mic/V3/Memory/Reminders.
- CI 71 cũ + 20 mới PASS; Cloudflare sandbox D1 + rollback PASS: https://github.com/hvnm1206/TikTak-Service/actions/runs/43579648460 . Release theo version gate, D1 bookmark và rollback PASS: https://github.com/hvnm1206/TikTak-Service/actions/runs/43579758792 .
- Version rollback đúng về trước nâng cấp audio/theme: `08e0bbf2-a2e5-4b98-94dc-0cfee882e5b6`. D1 bookmark được lưu artifact 30 ngày, không migration mới lần này.
- Sau deploy Guarded Operator GET /health, /api/v3/config, /api/reminders/capabilities đều 200 READY. Không đụng Ngáo.
- Chưa nghiệm thu tai nghe/loa iPhone thực; có thể chỉnh gain cao nhưng Safari/hardware vẫn giới hạn và có thể bị méo, cần phản hồi người dùng. Người dùng mở bản chính, vào SETUP chọn theme và tăng âm lượng, thử THỬ GIỌNG AI MARIN và NÓI. Không công bố iPhone PASS trước phản hồi.
- Các nhật ký phiên bản cũ bên dưới là lịch sử, bản cập nhật này là hiện trạng hiện hành.


## CẬP NHẬT MỚI NHẤT 14/11/2026 — NGỐ P0 ĐÃ DEPLOY BẢN CHÍNH
- Theo yêu cầu, đã phát hành Ngố P0 vào Worker CHÍNH `nmh-voice-gpt-test`, URL **https://nmh-voice-gpt-test.magical-budget.workers.dev/**; version mới `08e0bbf2-a2e5-4b98-94dc-0cfee882e5b6`.
- Workflow https://github.com/hvnm1206/TikTak-Service/actions/runs/43578218605 **SUCCESS**: 71 kiểm thử cũ + 17 mới PASS; D1 migration 0004 chỉ bổ sung hai bảng; source deploy trên đúng nhánh `nmh-voice-actions-reminders-p0-20261114`; smoke voice, Marin marker, V3, Google config, status/unauth PASS.
- Kiểm tra độc lập sau deploy bằng Guard/Operator: /health HTTP 200, /api/v3/config HTTP 200 ready, /api/reminders/capabilities HTTP 200 với `enabled:true`, `foregroundOnly:true`.
- D1 Time Travel bookmark và Worker baseline đã lưu artifact 30 ngày tại run trên. **Rollback code chính xác**: `fb2bacc5-b26e-4abc-9ee1-78cc222ac221`; cần lưu ý code rollback không tự undo D1 (migration chỉ cộng bảng).
- `NMH_REMINDERS_MODE=active`, `NMH_MEMORY_V2_MODE=active`. Giữ nguyên URL, micro/SpeechRecognition, Marin chính, Web Search, Google OAuth, V3 và Memory V2. Không chạm Ngáo.
- **Chưa có bằng chứng UAT giọng nói trên iPhone thực**. Người dùng sẽ thử trên bản chính: đăng nhập Google, API key, nói “2 phút nữa nhắc tao uống thuốc” khi app đang mở, kiểm tra xác nhận lưu và phát Marin đúng hạn. Nếu gặp lỗi thì khóa tính năng/rollback sau khi phân tích lỗi, không tuyên bố nghiệm thu iPhone trước.
- Mọi dòng “CHƯA DEPLOY production” dưới đây là nhật ký lịch sử **đã được thay thế** bởi bản cập nhật này.


## BỔ SUNG 14/11/2026 — NGỐ P0 PILOT ĐÃ CHẠY CLOUDFARE (KHÔNG PHẢI PRODUCTION)
- Pilot độc lập: https://nmh-ngo-p0-pilot-20261114.magical-budget.workers.dev/ — Worker + D1 riêng, cờ nhắc việc active CHỈ trong pilot.
- GitHub Actions bốn gate PASS: https://github.com/hvnm1206/TikTak-Service/actions/runs/43577570928 ; Guarded Operator GET /health PASS, HTTP 200. 71 bài cũ + 17 bài mới PASS. Sandbox rollback phiên bản chính xác PASS trước đó.
- Worker production nmh-voice-gpt-test vẫn giữ version fb2bacc5-b26e-4abc-9ee1-78cc222ac221, D1 production không đổi. NGÁO hoàn toàn không đụng.
- Chưa nghiệm thu iPhone thật + OpenAI key + Google subject + Marin nhắc 2 phút. Chưa phát hành production. Pilot cần đăng nhập và Setup riêng vì dùng D1 riêng.


## CẬP NHẬT THỰC THI NGỐ P0 — 14/11/2026 (NHÁNH CÁCH LY, CHƯA DEPLOY PRODUCTION)

- Mã mới NGỐ: https://github.com/hvnm1206/TikTak-Service/tree/nmh-voice-actions-reminders-p0-20261114/voice-deploy
- Báo cáo thực thi và giới hạn nghiệm thu: https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-actions-reminders-p0-20261114/voice-deploy/NGO_P0_EXECUTION_REPORT_20261114.md
- ĐÃ XÂY TRÊN NHÁNH CÁCH LY: ActionRegistry, backend xác nhận sau D1 readback, đặt/xem/hủy nhắc theo Google subject, claim nguyên tử chống lặp multi-tab, foreground notification/Marin retry, trace audit, feature flag mặc định OFF. Migration 0004 chỉ cộng bảng; CHƯA áp dụng production.
- TEST THỰC TẾ MỚI NHẤT: 71 bài hồi quy cũ + 17 bài mới PASS tại https://github.com/hvnm1206/TikTak-Service/actions/runs/43577061612 ; Worker/D1 Cloudflare sandbox thật, readback, chống trùng, rollback version chính xác, dọn sạch PASS tại https://github.com/hvnm1206/TikTak-Service/actions/runs/43577061663 .
- Backup baseline: Worker version fb2bacc5-b26e-4abc-9ee1-78cc222ac221, Time Travel D1 bookmark artifact ở https://github.com/hvnm1206/TikTak-Service/actions/runs/43575735755 .
- PRODUCTION CHƯA ĐỔI: Worker nmh-voice-gpt-test URL https://nmh-voice-gpt-test.magical-budget.workers.dev/ ; D1 nmh-voice-v3; giữ nguyên dữ liệu và các chức năng Voice/Marin/Search/OAuth/Memory V2.
- CHƯA DONE: chưa test end-to-end OpenAI API key và Google subject thực của người dùng trên iPhone; chưa có bằng chứng lời nhắc 2 phút phát thực khi foreground. Không công bố iPhone PASS. Không hứa nhắc khi app đóng/khóa màn hình.
- NGÁO CẤM sửa/deploy/đụng dữ liệu hoặc hạ tầng. Nhánh tài liệu nmh-voice-gpt-v1 không phải mã production, tuyệt đối không deploy từ nhánh này.

---

## CẬP NHẬT CHỐT 14/11/2026 — NGỐ / NMH VOICE GPT (ĐỌC TRƯỚC CÁC MỐC LỊCH SỬ)

**Đây là nguồn bàn giao MỚI NHẤT, chỉ ghi kế hoạch và nguồn kỹ thuật; CHƯA triển khai nhắc việc.**

- **Bàn giao thực thi — phạm vi đã chọn, nguồn thật, điều kiện nghiệm thu, D1/Worker, rollback:** https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-gpt-v1/voice-deploy/NGO_SELECTED_SCOPE_HANDOVER_20261114.md
- **Prompt cửa mới (sao chép nguyên bản):** https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-gpt-v1/voice-deploy/NGO_NEXT_CHAT_PROMPT_20261114.md
- **Chốt chỉ 3 việc:** ActionRegistry/ACK thống nhất; nhắc việc trong app đang mở (đặt/xem/hủy, D1, không lặp, xác nhận sau readback); chẩn đoán + kiểm thử hồi quy. KHÔNG chọn VAD, TTS streaming, Web Push/nhắc khi app đóng, clip, luật giao thông trong đợt này.
- **Hiện trạng production đã xác nhận 14/11:** Worker nmh-voice-gpt-test, URL https://nmh-voice-gpt-test.magical-budget.workers.dev/, version fb2bacc5-b26e-4abc-9ee1-78cc222ac221, API health HTTP 200. Bằng chứng deploy https://github.com/hvnm1206/TikTak-Service/actions/runs/43569160880 và ghi D1 thật https://github.com/hvnm1206/TikTak-Service/actions/runs/43569516448. Phải truy vấn version lại khi mở cửa mới.
- **Cảnh báo nguồn:** Tab BẢO TRÌ lấy Markdown từ nhánh nmh-voice-gpt-v1, nhưng CODE mới lấy từ nhánh nmh-voice-memory-v2-stage-20261114. Các mốc 51bd/cleanup cũ bên dưới là LỊCH SỬ, không phải căn cứ để rollback/deploy source cũ.
- **Ngáo tuyệt đối CHỈ ĐỌC để tham khảo**, không sửa/deploy/hạ tầng/dữ liệu. Không cập nhật code hoặc production khi chỉ làm bàn giao tài liệu.
- Giới hạn tài liệu /api/docs/maintenance tối đa 60.000 ký tự; cập nhật ngắn, nội dung dài lưu ở file bàn giao bên trên.

---


## 14/11/2026 — DỌN BỎ TOÀN BỘ LUỒNG GHI FILE BẰNG GIỌNG NÓI THỬ NGHIỆM (TRẠNG THÁI CHỐT MỚI NHẤT)

**Yêu cầu:** Người dùng yêu cầu dọn sạch những chức năng thử nghiệm làm hỏng hội thoại, cấm làm mất các chức năng đang chạy. Giữ nguyên dữ liệu lưu trong D1, không xóa ghi nhớ hay tài liệu người dùng.

**Đã thực hiện và kiểm chứng mã nguồn:**
- `agent-v2.js`: loại bỏ hoàn toàn công cụ GPT `save_note`, callback `onSaveNote`, bộ lọc từ khóa `allowNoteTool` và các nhánh lỗi tool. Công cụ Web Search và các công cụ thông tin thời tiết/thời gian/tin tức/Wikipedia giữ nguyên, cũng như lời nói gọn và phân tách nguồn.
- `worker.js`: loại bỏ đường chặn `handleVoiceNote()` và `onSaveNote` của `/api/chat`. Giữ nguyên `handleVoiceMemory()` (ghi nhớ chủ động cũ), `loadV3Context()`, mic Web Speech, Marin TTS prefetch, Presence, Google OAuth và D1.
- `v3-backend.js`: loại bỏ code noteIntent/handleVoiceNote thử nghiệm; **không động đến schema hoặc bản ghi** trong `v3_documents`, `v3_chunks`, `v3_memories`.
- `v3-ui.js`: bỏ trạng thái file GHI_CHU.md thử nghiệm; **giữ nguyên kho tài liệu thủ công (TXT/MD), ghi nhớ chủ động, prompt cá nhân và đăng nhập Google**.
- Test cũ của tool save_note được thay bằng test hội thoại bình thường sau lịch sử lệnh ghi chú. CI không chạy test file note đã bị bỏ khỏi đường thực thi. Không đưa mã Ngáo vào production.

**Kết quả:** [Release Actions 43549832431](https://github.com/hvnm1206/TikTak-Service/actions/runs/43549832431) `verify=SUCCESS`, `deploy-cleanup-notes-once=SUCCESS`, `deploy=SKIPPED`. `VOICE_CLEANUP_EDGE_READY=1`, `VOICE_CLEANUP_SMOKE=MIC_TTS_SEARCH_V3_D1_OAUTH_PRESENCE_SECURITY_PASS`, `VOICE_CLEANUP_RELEASE=DEPLOYED`. Cloudflare Worker chính thức `nmh-voice-gpt-test` tại `https://nmh-voice-gpt-test.magical-budget.workers.dev/`, version mới **`51bd4dde-0d73-455c-b1ed-6bac8965de66`**, baseline rollback **`962b29ff-709c-4b64-978a-259f86221d9c`** (bản cũ còn lỗi ghi chú, không coi là bản sạch). [CI trước release 43549739234](https://github.com/hvnm1206/TikTak-Service/actions/runs/43549739234) 36/36 Voice PASS + 7/7 V3 PASS. One-shot deploy job đã được gỡ sau thành công.

**Giới hạn:** Chức năng **ghi vào file ghi chú bằng giọng nói hiện TẠM GỠ** vì không được nghiệm thu, không có thao tác ghi file qua GPT; người dùng vẫn có thể nhập/upload tài liệu thủ công tại SETUP và sử dụng ghi nhớ chủ động như trước. Các file GHI_CHU.md đã lưu trong D1, nếu có, **không bị xóa**. Test CI/HTTP không chứng minh E2E mic/Marin trên iPhone; không tuyên bố đã kiểm chứng nghe thực. Mọi nội dung cũ khẳng định note-save khả dụng phải đối chiếu với mục này.

---

## 14/11/2026 — GHI CHÚ: KIỂM TRA D1 THẬT VÀ XÁC NHẬN SAU GHI (MỚI NHẤT)

**Bối cảnh:** Người dùng vẫn báo lệnh bằng giọng không lưu nội dung. Không được dùng mock tests hoặc HTTP 200 để kết luận đã nghiệm thu trên tài khoản của người dùng.

**Bằng chứng đọc D1 thật (chỉ số tổng hợp, không đọc dữ liệu riêng):** GitHub Actions 43546692890, `D1_READONLY_AUDIT=PASS`: database `nmh-voice-v3` có `note_files=1`, `note_segments=2`, `active_sessions=5` tại thời điểm kiểm tra. Điều này **không xác định file có thuộc tài khoản người dùng đang báo lỗi hay không**.

**Kiểm thử E2E thật với tài khoản tổng hợp riêng:** [Actions 43547084583](https://github.com/hvnm1206/TikTak-Service/actions/runs/43547084583): `LIVE_SYNTHETIC_NOTE_E2E=PASS`, `LIVE_NOTE_CREATE_APPEND_READ_AUTH=PASS`, `LIVE_SYNTHETIC_USER_CLEANUP=PASS`. Test chạy qua URL production, phiên D1 riêng tạm thời, tạo note bằng lệnh `/api/chat`, append lần 2, GET file qua `/api/v3/documents`, đọc lại bằng lệnh; bản thử đã xóa sạch. Bước thử lần đầu 43546972528 HTTP 403 do Python HTTP client, lần sau với header User-Agent phù hợp thành công. **E2E này áp dụng cho production version trước lần phát hành mới, không cho phiên iPhone của người dùng.**

**Sửa mã nguồn phát hành mới:** Trong `v3-backend.js`, ghi mới và append chỉ trả `saved:true` sau khi đọc lại đồng thời `v3_documents.raw_text` và `v3_chunks.body` đúng chủ sở hữu, đúng nội dung, đúng segment. Phản hồi success trực tiếp: `Đã ghi và kiểm tra trong GHI_CHU.md, mục N.`; lỗi xác minh báo rõ không thể xác nhận, không nói "đã lưu". `worker.js` callback GPT `save_note` chỉ thành công nếu backend trả `saved===true`; `agent-v2.js` nhận receipt file+segment. SETUP → KHO TÀI LIỆU bổ sung trạng thái `GHI_CHU.md — N mục đã lưu trong D1` theo Google session hiện hành, hoặc báo chưa có ghi chú cho tài khoản đó. Không tự tạo DB hay thay key/OAuth; Voice, Marin, Web Search giữ nguyên.

**Kiểm thử:** [CI 43547380430](https://github.com/hvnm1206/TikTak-Service/actions/runs/43547380430) 40/40 Voice và 11/11 V3/note PASS, có test read-after-write và không xác nhận thành công khi đọc lại thất bại. [Release 43547663180](https://github.com/hvnm1206/TikTak-Service/actions/runs/43547663180): verify=SUCCESS, release-verified-notes-once=SUCCESS, generic deploy=SKIPPED, smoke `VERIFIED_NOTES_SMOKE=VOICE_WEB_V3_D1_OAUTH_UI_SECURITY_PASS`, `VERIFIED_NOTES_RELEASE=DEPLOYED`. Cloudflare version mới `962b29ff-709c-4b64-978a-259f86221d9c`, baseline rollback `73b787ad-dcb9-427b-aea1-cddaca235295`. One-shot workflow deploy/audit/test đã gỡ.

**Giới hạn xác minh:** Chưa đo/đọc được người dùng đã nói câu cụ thể nào ở iPhone, chưa kiểm tra session Google của chính người dùng, chưa kiểm thử GPT semantic tool thực qua API key của người dùng. Kiểm thử live synthetic lặp lại sau bản phát hành mới không chạy được do công cụ từ chối thao tác; không tuyên bố PASS. Không khẳng định lỗi người dùng đã được giải quyết chỉ vì có receipt hoặc CI. Nếu app tiếp tục không ghi, cần dựa vào câu thoại được nhận dạng, câu trả lời lưu thất bại, trạng thái file theo account tại SETUP; tuyệt đối không thu hoặc in API key, cookie hay nội dung riêng vào log.

---

## 14/11/2026 — HOTFIX: SAVE_NOTE CHIẾM LUỒNG HỘI THOẠI SAU MỘT LỆNH LƯU (MỚI NHẤT)

**Báo lỗi thực tế từ người dùng:** Sau khi ra một lệnh ghi chú, mọi câu hỏi tiếp theo đều bị phản hồi "Không có yêu cầu ghi chú rõ ràng. Chưa lưu." Đây là hồi quy nghiêm trọng của release trước.

**Nguyên nhân xác minh từ source:** `runAgent()` trước đây luôn khai báo function `save_note` cho mọi lượt khi Worker truyền callback `onSaveNote`, kể cả khi lượt người dùng mới không yêu cầu lưu. GPT có thể chọn nhầm function do lịch sử ghi chú; Worker từ chối đúng về quyền ghi nhưng Agent lại lấy nội dung lỗi từ công cụ làm câu trả lời chính và không tiếp tục xử lý câu hỏi. Khi có `save_note` bất hợp lệ, code cũ còn có nguy cơ gọi callback trước khi kiểm tra điều kiện cho phép.

**Đã sửa:** Trong `agent-v2.js`, chỉ khai báo `save_note` khi *lượt người dùng hiện tại* có tín hiệu ghi/lưu rõ ràng; lệnh lưu các lượt trước không được cấp tiếp. Khi model vẫn gửi bất ngờ `save_note` trên lượt không có quyền: không gọi callback/không ghi D1/không hiển thị lỗi lưu, gửi tool-output từ chối cho model để tiếp tục trả lời câu hỏi mới. Loại bỏ việc đẩy `response.output` lặp lại; thêm hướng dẫn không mang ý định ghi chú của lượt trước qua lượt sau. Không thay đổi nội dung đã lưu, dữ liệu người dùng, OAuth, D1 schema, STT, Marin, Web Search, UI hay endpoint.

**Bằng chứng regression:** [Actions 43544388336](https://github.com/hvnm1206/TikTak-Service/actions/runs/43544388336): 40/40 Voice PASS + 10/10 V3/note PASS, gồm 3 test mới: (1) lưu ở lượt trước, lượt sau hỏi kiến thức vẫn được trả lời, không có `save_note` trong tools; (2) giả lập upstream gửi `save_note` trái phép, callback không được gọi và lượt tiếp theo trả lời bình thường; (3) sau hội thoại bình thường, yêu cầu lưu hợp lệ vẫn ghi một lần. Các CI thất bại trung gian 43544203357/43544281746/43544320933 đã được xử lý; không phải production deploy.

**Production đã phát hành:** Worker `nmh-voice-gpt-test`; URL `https://nmh-voice-gpt-test.magical-budget.workers.dev/`; Cloudflare version **`73b787ad-dcb9-427b-aea1-cddaca235295`** theo Wrangler. [Actions 43544520392](https://github.com/hvnm1206/TikTak-Service/actions/runs/43544520392): `verify=SUCCESS`, `deploy-note-hijack-fix-once=SUCCESS`, `deploy=SKIPPED`, `NOTE_HIJACK_EDGE_READY=1`, `NOTE_HIJACK_SMOKE=VOICE_WEB_V3_D1_OAUTH_UI_SECURITY_PASS`, `NOTE_HIJACK_RELEASE=DEPLOYED`. Version cũ `17252e9a-c3b4-4784-a71c-cbca7190085d` được ghi nhận làm baseline nhưng **có lỗi note hijack**, không xem là bản sạch để rollback tính năng này. Job phát hành một lần đã được gỡ khỏi nhánh sau deploy.

**Giới hạn nghiệm thu:** CI mô phỏng và HTTP runtime PASS; chưa có bằng chứng hội thoại thực với API key OpenAI và Google session của người dùng trên iPhone sau hotfix. Không tuyên bố E2E hoàn thành. Nếu vẫn tái diễn, phải thu thập văn bản câu hỏi và câu trả lời trong nhật ký (không thu API key hoặc token), kiểm tra logic lượt hiện tại. Không vá chuỗi cố định hoặc thêm prompt theo từng câu lỗi.

---

## 14/11/2026 — SỬA GHI CHÚ KHÔNG LƯU KHI RA LỆNH TỰ NHIÊN (MỚI NHẤT)

**Tình trạng tiếp nhận:** Người dùng báo “Nó không hề ghi khi yêu cầu”. Kiểm tra source production phát hiện `noteIntent()` ban đầu chỉ chấp nhận các mẫu rất hẹp (ví dụ “Ghi vào file ghi chú ...”), còn “Ngố, ghi lại cho tao ...” hoặc “Ghi lại ...” trả `null` và bị chuyển tới GPT như hội thoại thông thường, không thực hiện ghi D1. Ngoài ra KHO TÀI LIỆU chỉ gọi `populate()` khi load/login, không tự refresh lúc mở SETUP nên có thể hiển thị danh sách cũ.

**Đối sách đã phát hành:**
- `v3-backend.js`: mở rộng bộ nhận lệnh ghi chú rõ ràng theo lời nói tự nhiên, giữ nguyên kiểm tra Google session, giới hạn kích thước, và write owner-scope vào tài liệu `GHI_CHU.md` trong D1. Không tự ghi mọi hội thoại.
- `agent-v2.js`: thêm hosted model function `save_note` (chỉ khi người dùng ra lệnh lưu). GPT hiểu các diễn đạt không trùng mẫu regex; action xử lý qua callback an toàn, không để GPT tự tuyên bố lưu thành công. Khi callback trả lỗi, trả về lỗi ghi chú cụ thể; không tiếp tục tạo câu "đã lưu" không có bằng chứng.
- `worker.js`: callback lưu ghi chú đi qua đúng `handleVoiceNote`, xác minh cue lưu trong lời người dùng, bảo toàn cookie phiên Google, D1, không đưa D1 credential hay secret vào GPT.
- `v3-ui.js` + `worker.js`: khi mở lại SETUP, đọc lại trạng thái/tài liệu từ backend thông qua `nmhV3Refresh`, không chỉ hiển thị cache của lần đăng nhập đầu.
- Giữ nguyên Web Search, Marin prefetch, mic/STT, OAuth Web Client, D1 database, Presence, nhật ký và chi phí.

**Production mới:** `https://nmh-voice-gpt-test.magical-budget.workers.dev/`; Worker `nmh-voice-gpt-test`; Cloudflare Worker Version theo Wrangler `17252e9a-c3b4-4784-a71c-cbca7190085d`. [Release Actions 43542690055](https://github.com/hvnm1206/TikTak-Service/actions/runs/43542690055): `verify=SUCCESS`, `deploy-natural-notes-once=SUCCESS`, `deploy=SKIPPED`, `NATURAL_NOTES_SMOKE=VOICE_WEB_V3_D1_OAUTH_UI_SECURITY_PASS`, `NATURAL_NOTES_RELEASE=DEPLOYED`. Rollback baseline `cb25a9bc-83ab-4607-99b8-70df2b58b1f0`. Đã gỡ job phát hành dùng một lần sau khi deploy.

**Test:** [Actions 43542517955](https://github.com/hvnm1206/TikTak-Service/actions/runs/43542517955) 37/37 Voice PASS, 10/10 V3/note PASS; gồm nhận ra lệnh tự nhiên, ghi và đọc tài liệu D1 theo Google subject trong mocked DB, GPT callback save_note thành công/thất bại và không xuất công cụ khi callback thiếu. Các kiểm thử là mock/CI, chưa có một lần nói → OpenAI API thực → lưu D1 bằng phiên Google iPhone thật. Không tuyên bố E2E PASS nếu thiếu bằng chứng thật.

**Chú ý:** Người dùng phải còn đăng nhập Google trong đúng origin production; nếu không, ghi chú trả thông báo chưa lưu. Sau khi ghi xong, mở lại SETUP → KHO TÀI LIỆU để xem `GHI_CHU.md`. Tuyệt đối không nhầm với `v3_memories` (GHI NHỚ CHỦ ĐỘNG) là bảng khác. Không đọc/ghi tiết lộ file cá nhân, không tạo DB khác.

---

## 14/11/2026 — GHI CHÚ BẰNG GIỌNG NÓI + TRẢ LỜI NGẮN, NGUỒN RIÊNG (MỚI NHẤT)

**Đã phát hành production:** Worker `nmh-voice-gpt-test`, URL `https://nmh-voice-gpt-test.magical-budget.workers.dev/`, Cloudflare active version theo Wrangler **`cb25a9bc-83ab-4607-99b8-70df2b58b1f0`**, release source `1f471eccb3b13546622e106359d900a2d327f240`. [GitHub Actions 43540527297](https://github.com/hvnm1206/TikTak-Service/actions/runs/43540527297): verify=SUCCESS, deploy-notes-once=SUCCESS, generic deploy=SKIPPED, smoke `VOICE_NOTE_RELEASE_SMOKE=VOICE_D1_OAUTH_WEB_UI_SECURITY_PASS`, `VOICE_NOTE_RELEASE=DEPLOYED`. Baseline rollback: `c48b6a80-77e6-4476-a6c2-c551c1d838a8`. Release one-shot gate đã được gỡ trên nhánh.

**Chức năng ghi chú:** `v3-backend.js` thêm `noteIntent()` và `handleVoiceNote()`. Lệnh giọng nói rõ ràng như “Ghi vào file ghi chú mua bóng đèn ngày mai”, “Thêm vào ghi chú kiểm tra máy bơm”, “Ghi chú rằng…” tạo hoặc bổ sung vào tài liệu **`GHI_CHU.md`** trong Cloudflare D1 *hiện hữu* theo chủ tài khoản Google, lưu `raw_text` cùng index `v3_chunks`. Có thể xem file trong **SETUP → KHO TÀI LIỆU**, đọc bằng lệnh “Đọc file ghi chú”. Không tự ghi hội thoại thông thường; không đổi các ghi nhớ chủ động trong `v3_memories`; không tạo database hoặc dịch vụ khác. Nếu chưa đăng nhập Google, báo “Chưa lưu” và không ghi. Giới hạn mỗi lần 500 ký tự, mỗi file tối đa 100 mục / 60.000 ký tự. Kết quả “Đã ghi” chỉ trả sau D1 batch thành công. Tạo hoặc ghi thêm thông qua câu lệnh là tính năng mới, không phải bản backup của ghi nhớ cũ.

**Dẫn nguồn:** `agent-v2.js` yêu cầu trả lời thoại trực tiếp 1–2 câu thông thường, không đọc URL/tên nguồn dài; `cleanVoiceAnswer` loại link/citation text. Các nguồn web có URL vẫn đi dưới dạng `sources` độc lập và được thu gọn mặc định trong **NHẬT KÝ → Nguồn tham khảo**, không chèn vào lời đọc Marin. Giữ nguyên Web Search, prefetch Marin, STT, Presence, login Google.

**Bằng chứng CI:** [Actions 43540424912](https://github.com/hvnm1206/TikTak-Service/actions/runs/43540424912) 34/34 Voice PASS và 10/10 V3 + note PASS; lưu note rõ lệnh, đọc file, owner scope, từ chối chưa login, không lưu thành công giả, lọc citations. Release CI verify PASS, smoke PASS.

**Giới hạn:** Chưa thực hiện lưu ghi chú bằng cookie Google thực của người dùng trên iPhone và chưa phát nghe Marin thực với API key cục bộ. HTTP/CI không thay thế E2E. Không in token hay dữ liệu riêng. Bản phát hành đã chạy, nhưng ghi chú trên phiên người dùng chưa được nghiệm thu thực.

---

## 14/11/2026 — SỬA LỖI GHI NHỚ V3 KHÔNG TRẢ LỜI ĐƯỢC CÂU HỎI GIÁN TIẾP (MỚI NHẤT)

**Triệu chứng:** iPhone hiển thị ghi nhớ đã lưu trong SETUP như “Chủ nhân tên là Hải béo”, “Mày tên là Ngố”, nhưng câu “Mày biết tao là ai không?” không được GPT trả đúng. **Nguyên nhân xác minh từ source:** `loadV3Context()` ở `v3-backend.js` tính điểm trùng từ khóa `scoreSegment` rồi `filter(x=>x.score>0)`. Câu hỏi danh tính gián tiếp không có từ trùng, nên ghi nhớ đã lưu bị loại trước khi đưa vào GPT. Đây là lỗi truy xuất, không chứng minh D1 mất dữ liệu.

**Đối sách đã triển khai:** Giữ ưu tiên các ghi nhớ có điểm liên quan, sau đó điền bằng ghi nhớ chủ động lưu gần đây tới giới hạn tối đa 6 mục, vẫn scoped theo Google subject. Không ép GPT ghi nhớ hội thoại, không sửa/xóa database hoặc dữ liệu cá nhân. `agent-v2.js`, STT, TTS Marin, Presence, Web Search và giao diện SETUP giữ nguyên. Không hard-code tên người hoặc câu hỏi.

**Production:** Worker `nmh-voice-gpt-test`, URL `https://nmh-voice-gpt-test.magical-budget.workers.dev/`, version theo Cloudflare Wrangler **`c48b6a80-77e6-4476-a6c2-c551c1d838a8`**, source release commit `3a593ac777ff657f0368720b61c91c98ff4368da`. [Actions 43538733196](https://github.com/hvnm1206/TikTak-Service/actions/runs/43538733196): verify SUCCESS, deploy-memory-context-once SUCCESS, smoke `MEMORY_CONTEXT_EDGE_READY=1`, `MEMORY_CONTEXT_SMOKE=VOICE_V3_OAUTH_D1_WEB_DOCS_PASS`, `MEMORY_CONTEXT_RELEASE=DEPLOYED`; baseline rollback `2d766e1e-2e3c-4d08-a3b7-2599827bc4ba`. Workflow một lần đã bị gỡ khỏi source sau phát hành.

**Test:** 33/33 Voice PASS và 7/7 V3 PASS, bổ sung assertions gián tiếp “Mày biết tao là ai không?” / “Bạn có biết tôi là ai không?” với ghi nhớ tên chủ nhân. Không dùng credential người dùng thật trong CI. Chưa kiểm chứng câu hỏi qua API key/Google session thật trên iPhone; không coi CI và HTTP smoke là E2E.

**Điều kiện nghiệm thu thực tế:** Người dùng đã đăng nhập Google trong SETUP (cùng phiên/trình duyệt), hỏi câu danh tính bằng Voice trên URL production; kiểm tra phản hồi. Nếu sai cần đối chiếu session/cookie và ngữ cảnh trả về mà không tiết lộ nội dung ghi nhớ trong log. Các thông báo “chưa triển khai”, “ghi nhớ không hoạt động” ở ghi chú cũ phải được đối chiếu mốc này.

---

## 14/11/2026 — GIẢM KHOẢNG DỪNG GIỮA CÁC ĐOẠN MARIN (MỚI NHẤT)

**ĐÃ PHÁT HÀNH PRODUCTION:** NMH Voice GPT vẫn ở URL `https://nmh-voice-gpt-test.magical-budget.workers.dev/`, Worker `nmh-voice-gpt-test`. Cloudflare active version **`2d766e1e-2e3c-4d08-a3b7-2599827bc4ba`** theo Wrangler của [Actions 43537774419](https://github.com/hvnm1206/TikTak-Service/actions/runs/43537774419). Release source commit `55270efa2b0051be5a44ffcc8b161b5395c1b5ef`. Baseline rollback bảo toàn `2773a953-6c7c-4ad6-9711-5c98bc8a1418`. Verify=SUCCESS, deploy-marin-prefetch-once=SUCCESS, generic deploy=SKIPPED. Smoke `MARIN_PREFETCH_EDGE_READY=1`, `MARIN_PREFETCH_SMOKE=VOICE_V3_WEB_DOCS_SECURITY_PASS`, `MARIN_PREFETCH_RELEASE=DEPLOYED`.

**Nguyên nhân đã xác định bằng source:** `speak()` cũ đợi `audioSource.onended` mới bắt đầu `fetchSpeechAudio` cho câu kế, gây khoảng im lặng theo độ trễ API TTS/giải mã. **Đối sách:** `worker.js` phát đoạn hiện tại đồng thời prefetch duy nhất đoạn kế tiếp; sau onended lấy âm thanh chuẩn bị sẵn. Chỉ một audio source được phát tại một thời điểm; controller prefetch bị abort khi NGẮT/KẾT THÚC hoặc `closeVoice()`. Giữ nguyên Marin TTS, STT Safari, Web Search, Presence, SETUP, OAuth và D1. Việc prefetch có thể tạo TTS sớm cho một đoạn chưa nghe nếu người dùng ngắt; đó là giới hạn chi phí phát sinh cần theo dõi.

**Bằng chứng:** [CI 43537604994](https://github.com/hvnm1206/TikTak-Service/actions/runs/43537604994) 33/33 Voice PASS + 7/7 V3 PASS; hai test mới kiểm tra bắt đầu fetch đoạn kế **trước** khi đoạn trước kết thúc, giữ thứ tự và không phát sau khi interrupt. CI release 43537774419 SUCCESS và HTTP production `/health`/config/HTML smoke PASS. Workflow one-shot đã gỡ khỏi nhánh sau triển khai (commit `ed9617b66b1f5fe4310001219a89ca180b9725c5`).

**Giới hạn nghiệm thu:** Chưa đo trực tiếp số mili giây khoảng dừng hay kiểm thử nghe thực trên iPhone sau sửa. Do TTS phía mạng có thể chậm hơn thời gian phát đoạn hiện tại, prefetch giảm nhưng không bảo đảm 0 ms trong mọi trường hợp. Không tuyên bố nghiệm thu chất lượng giọng thực tế chỉ từ CI/HTTP.

---

## 14/11/2026 — WEB SEARCH ĐÃ DEPLOY LÊN PRODUCTION (TRẠNG THÁI MỚI NHẤT)

**ĐÃ PHÁT HÀNH SOURCE, CHƯA NGHIỆM THU API KEY/IPHONE:** Worker chính thức `nmh-voice-gpt-test`, URL `https://nmh-voice-gpt-test.magical-budget.workers.dev/`, Cloudflare version **`2773a953-6c7c-4ad6-9711-5c98bc8a1418`** theo log Wrangler của [GitHub Actions 43536444631](https://github.com/hvnm1206/TikTak-Service/actions/runs/43536444631). Source release commit `0ab0be0fa7237ef1a4d80864c84ad86f7a991c59`. Verify=SUCCESS, deploy-web-search-once=SUCCESS, previous generic deploy=SKIPPED; predeploy Cloudflare API xác nhận baseline `8cc6032c-0035-414c-8217-7ea5e91825e5`. Smoke PASS: `POST_DEPLOY_RUNTIME=PASS_ATTEMPT_1`, `WEB_SEARCH_RELEASE_SMOKE=VOICE_UI_V3_DOCS_SECURITY_PASS`, `WEB_SEARCH_RELEASE=DEPLOYED`. One-shot release gate đã được gỡ ngay sau release (commit `d1298bbbb8cd6d20d6d6daf39bc72a1a85a152eb`).

**Phạm vi code:** Thêm hosted `web_search` trực tiếp vào Responses API trong `agent-v2.js`; phát hiện `web_search_call`, thu `url_citation`; giới hạn tối đa 1 built-in search / Responses request; giữ nguyên Open-Meteo/Wikipedia/Google News RSS; `worker.js` bổ sung ước phí tìm kiếm vào sổ trên thiết bị. Giữ nguyên Web SpeechRecognition, Marin TTS, Presence, V3 D1/Google OAuth và URL. Không tạo Worker hay database khác. Giá Web Search cơ bản 0,01 USD/lượt chưa gồm token nội dung. Sổ ước phí không phải hóa đơn.

**Giới hạn kiểm chứng bắt buộc:** 31/31 Voice và 7/7 V3 mock tests PASS, production HTTP/V3/UI/Unauthorized/Docs smoke PASS. **Chưa kiểm thử GPT Web Search với OpenAI API key thật** vì key ở SETUP của iPhone; **chưa nghiệm thu lượt mic → Web Search → Marin → nghe tiếp trên iPhone**. Đây là release được đưa vào production theo yêu cầu người dùng, nhưng không được tuyên bố end-to-end hoàn thành khi chưa có bằng chứng thực. Nếu xảy ra lỗi hồi quy, baseline rollback: `8cc6032c-0035-414c-8217-7ea5e91825e5` (dùng đúng config V3 khi rollback/verify).

**Những ghi chú "CHỈ STAGE/PREVIEW, CHƯA DEPLOY" phía dưới đã lỗi thời và bị thay thế bởi cập nhật này.** Không tự dựng lại phiên bản thử, Google OAuth origin preview hoặc pipeline release tạm.

---

## 14/11/2026 — WEB SEARCH HOSTED: CHỈ STAGE/PREVIEW, CHƯA DEPLOY PRODUCTION (MỚI NHẤT)

**Production tuyệt đối chưa thay đổi:** Worker `nmh-voice-gpt-test`, active version `8cc6032c-0035-414c-8217-7ea5e91825e5` được GitHub Actions kiểm tra bằng Cloudflare API trước và sau upload. URL production giữ nguyên `https://nmh-voice-gpt-test.magical-budget.workers.dev/`. **Production hiện CHƯA có Web Search tổng quát.**

**Mã nguồn đang ở nhánh `nmh-voice-gpt-v1`, chưa phát hành:** `voice-deploy/agent-v2.js` thêm hosted `web_search` Responses API cho `gpt-6-luna`; parse `web_search_call` + `url_citation`; giới hạn tối đa 1 hosted call mỗi lượt; trả `estimatedWebSearchUsd` (0,01 USD/call cơ bản, chưa tính token nội dung); sửa đơn giá ước phí GPT Luna theo tài liệu OpenAI Standard 0,10/0,01/0,50 USD cho 1M token input/cached/output. `worker.js` chỉ cộng khoản Web Search vào sổ ước phí giao diện đang có, giữ nguyên STT/SpeechRecognition, Marin, Presence, D1/OAuth. Các nguồn công cụ thời tiết/Wikipedia/RSS cũ được giữ.

**Bằng chứng CI:** [Actions 43534668517](https://github.com/hvnm1206/TikTak-Service/actions/runs/43534668517) `verify=SUCCESS`, `31/31 Voice PASS`, `7/7 V3 PASS`, `deploy=SKIPPED`. [Actions upload preview 43535038784](https://github.com/hvnm1206/TikTak-Service/actions/runs/43535038784): `verify=SUCCESS`, `nmh-web-search-version-preview=SUCCESS`, `deploy=SKIPPED`, `PRODUCTION_VERSION_UNCHANGED=PASS`.

**Bản preview phiên bản trên CHÍNH Worker (không tạo Worker/branch mới):** version `c0b6d225-2f0f-4217-9fa3-d39e8d292fe7`, URL `https://c0b6d225-nmh-voice-gpt-test.magical-budget.workers.dev/`. Guarded Operator đọc trực tiếp /health 200, /api/v3/config 200 `ready=true`, trang / 200 chứa giao diện Presence và sổ phí mới. Bản này dùng binding D1 V3 và Google Web Client hiện hành; **Google OAuth origin trên Version URL khác production nên không coi đăng nhập Google preview là đã nghiệm thu**. Workflow upload preview dùng một lần đã được gỡ khỏi source; phiên bản đã upload vẫn tồn tại để kiểm thử. Không deploy hoặc rollback production.

**ĐIỀU KIỆN CHƯA ĐẠT:** chưa có thử nghiệm Web Search với API key người dùng thực (key chỉ lưu trên iPhone/SETUP), chưa có kết quả địa điểm Mỹ Đình có nguồn qua API thật, chưa kiểm thử micro → search → Marin → nghe tiếp trên iPhone, chưa đối chiếu chi phí OpenAI Usage. Các bài test dùng response giả lập; không công bố nâng cấp hoàn thành. Không được promote version preview lên production khi chưa có bằng chứng E2E trên iPhone và đủ cổng rollback.

---

## 14/11/2026 — CHỐT DỌN DẸP SAU SỰ CỐ TÌM KIẾM (TRẠNG THÁI HIỆN HÀNH)

**PRODUCTION GIỮ NGUYÊN.** Cloudflare Worker `nmh-voice-gpt-test`, URL https://nmh-voice-gpt-test.magical-budget.workers.dev/, active version **`8cc6032c-0035-414c-8217-7ea5e91825e5`** đã kiểm chứng bằng Cloudflare API và HTTP sau dọn dẹp. Không deploy hay rollback Worker production trong đợt dọn dẹp này.

**DỌN XONG VÀ CÓ BẰNG CHỨNG:** [GitHub Actions 43531780452](https://github.com/hvnm1206/TikTak-Service/actions/runs/43531780452) **SUCCESS**:
- Xóa **chỉ** Cloudflare staging Worker `nmh-voice-search-lab-v2`; Cloudflare API đọc lại trả HTTP 404.
- Xóa **chỉ** hai nhánh thí nghiệm `nmh-voice-search-lab`, `nmh-voice-search-isolated-v2`; GitHub đọc lại trả HTTP 404.
- Xóa `.github/workflows/nmh-voice-rollback-search.yml`, mã test Safari tạm `voice-deploy/browser-voice-contract.test.mjs`, tài liệu lab `SEARCH_WEB_V2_LAB_2026-11-14.md`. Workflow dọn dẹp dùng một lần đã tự được gỡ khỏi source sau khi chạy; không còn workflow nào có thể tự dựng lại staging.
- Khôi phục `voice-deploy/presence-ui.js` **đúng blob SHA `4f9e5ad1e8826aed7b2ba1a714e197a9d39ba8d1`** của commit production baseline `3a40173817ab9f8bc4e93ce2c73bfd9d75ac1a03`; `worker.js`, `agent-v2.js`, `v3-ui.js` trước đó đã trùng byte-for-byte baseline. Loại bỏ CI test liên quan watchdog chưa phát hành.
- Giữ nguyên tài nguyên đã được người dùng dùng từ trước: Google Web Client, D1 `nmh-voice-v3`, tính cách Prompt, ghi nhớ, tài liệu TXT/Markdown, bộ nút NÓI/TIẾP TỤC, Marin TTS và bản Presence. **Không xóa D1, không thu hồi token, không xóa GitHub branch `nmh-voice-gpt-v1`, không đụng `main`**.
- Sau cleanup: GET `/health` PASS, GET `/api/v3/config` PASS (`ready=true, Cloudflare D1`), GET `/` có `avatar/start/resume`, không có `v3WebSearch`; HTTPS production `/search-lab` HTTP 404.

**TRẠNG THÁI TÌM KIẾM:** Không tồn tại Web Search nâng cao trong production. Các bộ thử bị bỏ và không được coi là phần đã triển khai. Chỉ còn công cụ công khai cũ (Open-Meteo, Wikipedia, Google News RSS). Nhu cầu tìm kiếm web thực sự **chưa được hoàn thành**.

**GIỚI HẠN NGHIỆM THU:** HTTP/API/CI và xác minh source **không** thay thế việc nghe–nói thực trên iPhone. Người dùng trước đó xác nhận bản rollback giao tiếp bình thường; sau cleanup không thay đổi production, nhưng chưa có lượt thử trực tiếp mới trong cùng thời điểm. Không tuyên bố E2E đã kiểm nghiệm trong lượt dọn dẹp.

**Những mục “ĐÃ DEPLOY TÌM KIẾM”, “STAGING ĐANG CÓ”, “HOTFIX WATCHDOG CHỜ DEPLOY” trong nhật ký trước đây đều là lịch sử và đã bị thay thế bởi kết luận trên.** Không lấy lại nhánh, Worker hay file thử nghiệm từ commit cũ nếu chưa có yêu cầu mới.

---

## 14/11/2026 — NMH VOICE V3 D1-ONLY: ĐÃ DEPLOY (ĐỌC TRƯỚC MỌI NHẬT KÝ CŨ)

**URL production giữ nguyên:** https://nmh-voice-gpt-test.magical-budget.workers.dev/ — Worker `nmh-voice-gpt-test` trên Cloudflare account Magical Budget. **Version production đã kiểm chứng:** `8cc6032c-0035-414c-8217-7ea5e91825e5`; source release commit `3a40173817ab9f8bc4e93ce2c73bfd9d75ac1a03`; [Actions release 43470633928](https://github.com/hvnm1206/TikTak-Service/actions/runs/43470633928) **SUCCESS** (verify + deploy đều PASS).

- **Google Web Client:** người dùng tự tạo OAuth Client loại Web application, Authorized JavaScript Origin là URL Worker, sau đó đặt `NMH_V3_GOOGLE_CLIENT_ID` vào GitHub Actions Secret. [Read-only capability 43469417270](https://github.com/hvnm1206/TikTak-Service/actions/runs/43469417270) chứng minh `V3_GOOGLE_WEB_CLIENT=CONFIGURED_VALID_FORMAT`, D1 HTTP 200, R2 không yêu cầu. Client ID chưa được thử bằng phiên đăng nhập Google của người dùng thực tế.
- **D1:** cơ sở dữ liệu `nmh-voice-v3`, id `3ce295cb-a84d-4a50-abee-d14fdd903514`; migration 0001 và 0002 (`v3_documents.raw_text`) đã chạy PASS trên Cloudflare. V3 lưu Prompt, ghi nhớ, tài liệu TXT/Markdown và đoạn chỉ mục trực tiếp trong D1; không dùng R2, không cần kích hoạt thanh toán.
- **Giao diện/Voice:** tích hợp V3 trong SETUP, Prompt tính cách tự sửa + mẫu, ghi nhớ chỉ lưu khi nhập tay hoặc ra lệnh rõ (có thêm/sửa/xóa), kho TXT/Markdown, hiển thị nguồn; vẫn dùng giao diện Canvas Presence, browser STT, GPT API và Marin.
- **Bảo mật:** Google ID token được backend xác minh RS256 + JWKS + audience/issuer/expiry; phiên cookie HttpOnly/Secure và hash phiên D1; truy vấn riêng theo chủ tài khoản, thao tác cập nhật kiểm soát origin. Các test cô lập dữ liệu giữa hai tài khoản là **test giả lập**, chưa phải E2E Google thực.
- **Sự cố và cách xử lý:** release [43470042637](https://github.com/hvnm1206/TikTak-Service/actions/runs/43470042637) upload version `8e52b401-a5fa-4780-b242-2ec420f2bfdf` nhưng smoke đọc V3 khi routing còn trả V2 (404); workflow **rollback thành công** về `abcac5e5-0749-45ac-8c94-1d1bed49df82`. Sau đó thêm `/health.v3Version="d1-only-google-v3"` và kiểm thử polling health + V3 config trên mỗi lần triển khai.
- **Bản phát hành cuối:** snapshot rollback `abcac5e5-0749-45ac-8c94-1d1bed49df82`, release `43470633928`: `V3_EDGE_READY_AT_ATTEMPT=1`, `V3_SMOKE=HEALTH_UI_D1_CONFIG_UNAUTH_LOGIN_INVALID_TOKEN_DOCS_OK`, `V3_DEPLOY_FINAL=SUCCESS`. Workflow `.github/workflows/nmh-voice-v3-release.yml` sau release đã **khóa lại về chỉ workflow_dispatch chủ động**, không auto-deploy khi push thông thường.
- **Đối chiếu độc lập bằng NMH Guarded Operator:** `GET /health` HTTP 200, `v3Version=d1-only-google-v3`; `GET /api/v3/config` HTTP 200, `ready=true, sync=true, storage=Cloudflare D1, r2Required=false`; trang `/` HTTP 200 có `avatar`, `v3Prompt`, `v3Memories`, `v3Documents`, Google GIS script và onload callback; `GET /api/v3/me` và `/api/v3/profile` khi chưa đăng nhập đều HTTP 401; `/api/docs/maintenance` HTTP 200.
- **Chưa nghiệm thu:** Google Sign-In bằng tài khoản thật và đồng bộ giữa iPhone với máy tính; voice ra lệnh ghi nhớ thực; trả lời trên tài liệu thực; PDF/DOCX/OCR; so sánh phí GPT/Marin thực, iPhone Voice E2E. `ready=true` là backend D1/OAuth cấu hình đúng, **không phải bằng chứng người dùng đã đăng nhập hoặc đồng bộ E2E**. Cần người dùng thực hiện một phiên đăng nhập Google, sau đó kiểm tra trên hai thiết bị mới được đóng các mục này. Google Consent External/Testing có thể cần thêm tài khoản vào danh sách Test users nếu Google từ chối đăng nhập.

**Trạng thái:** PHÁT HÀNH / HTTP SMOKE **PASS**; NGHIỆM THU NGƯỜI DÙNG & TÀI LIỆU PDF/DOCX **CHƯA ĐẠT**. Giữ tiêu chuẩn không đánh đồng một lần CI thành nghiệm thu toàn bộ.

---


## V3 — THAY THẾ R2 BẰNG D1-ONLY (13/11/2026, TRẠNG THÁI MỚI NHẤT)

**QUYẾT ĐỊNH:** R2 chưa kích hoạt được vì lỗi thanh toán của Cloudflare. Không tiếp tục yêu cầu đăng ký/thẻ. Dùng D1 đã tồn tại để lưu cả Prompt, ghi nhớ, tài liệu văn bản và chỉ mục. Giữ Google Sign-In như phương án người dùng đã duyệt; chưa cấu hình Web Client, nên V3 **chưa triển khai production**.

**Đã thực hiện trên Cloudflare thật:**
- D1 `nmh-voice-v3`, ID `3ce295cb-a84d-4a50-abee-d14fdd903514`, migration gốc PASS.
- Schema D1-only bổ sung cột `v3_documents.raw_text TEXT` đã thực hiện trực tiếp qua Cloudflare API và đọc lại: [Actions 43466192818](https://github.com/hvnm1206/TikTak-Service/actions/runs/43466192818), `V3_D1_DOC_TEXT_COLUMN=CREATED`, `V3_D1_TEXT_ONLY_MIGRATION=PASS`, số tài liệu ở lúc kiểm tra = 0. Không xóa hoặc di chuyển dữ liệu người dùng.
- Source `voice-deploy/v3-backend.js` lưu nội dung nguyên văn và các đoạn chỉ mục trực tiếp vào D1 trong batch; GET danh mục, xem nội dung theo chủ tài khoản, xóa metadata + segments; bỏ mọi lệnh `NMH_DOCS.put/delete`, không yêu cầu R2 binding.
- `voice-deploy/v3-ui.js` ghi rõ kho TXT/Markdown lưu D1; có thao tác XEM, XÓA; PDF/DOCX/OCR chưa trích xuất và không được công bố đã hỗ trợ.
- Workflow `nmh-voice-v3-provision.yml`, `nmh-voice-v3-release.yml` đã loại bỏ R2 gate và binding; `nmh-voice-v3-capability.yml` chỉ cần D1.
- SQL migration `voice-deploy/migrations/0002_v3_d1_only.sql` đã được sửa ký tự xuống dòng chuẩn sau một lần test schema phát hiện lỗi định dạng.
- [CI 43466750674](https://github.com/hvnm1206/TikTak-Service/actions/runs/43466750674): V2 **26/26 PASS**, V3 **7/7 PASS**, SQLite schema 0001+0002 PASS, workflow YAML PASS, Worker deploy SKIPPED. Worker production cũ vẫn version `abcac5e5-0749-45ac-8c94-1d1bed49df82`.
- Tài khoản Cloudflare vẫn không có R2 subscription; không còn phụ thuộc R2 đối với tài liệu văn bản. Theo Cloudflare D1 Free: giới hạn 500MB/database và 5GB/account; lưu ý read/write daily quotas.

**Chưa đạt / bước phải tiếp tục:**
1. **Google OAuth Web Client:** tạo ứng dụng web cho origin `https://nmh-voice-gpt-test.magical-budget.workers.dev` và lưu Client ID vào GitHub Secret `NMH_V3_GOOGLE_CLIENT_ID`; OAuth của Operator không thể tự coi là web client này.
2. Khi Google Web Client đã được xác minh, deploy theo `.github/workflows/nmh-voice-v3-release.yml` (snapshot Worker cũ + rollback), test login thực, đồng bộ Prompt/ghi nhớ giữa 2 thiết bị, tài liệu TXT/MD, cô lập 2 tài khoản và STT/Marin/Presence regression.
3. PDF/DOCX/OCR chưa hoàn thành: phải thực hiện bước trích xuất chữ theo giới hạn D1 trước khi có thể tuyên bố hỗ trợ những định dạng này.
4. Chưa có bằng chứng Voice V3 E2E trên iPhone hoặc hóa đơn GPT/TTS; không gắn PASS.

**Kết luận:** Giải quyết dứt điểm **phụ thuộc R2/billing cho kho văn bản**, nhưng dự án V3 nói chung còn cổng Google Web Client + nghiệm thu thực; **không deploy khi chưa đủ cổng**.

---


## V3 — CẬP NHẬT HẠ TẦNG 13/11/2026 SAU KHI CẤP TOKEN (ƯU TIÊN TRƯỚC CÁC GHI CHÚ V3 CŨ)

**D1 ĐÃ ĐẠT VỀ HẠ TẦNG; V3 CHƯA PHÁT HÀNH.** Người dùng đã tự cấu hình Secret `NMH_V3_CF_PROVISION_TOKEN` trong GitHub và không gửi giá trị token vào chat. Không sửa token Worker cũ.

- **Đối chiếu token mới:** [Actions 43459324694](https://github.com/hvnm1206/TikTak-Service/actions/runs/43459324694) qua Cloudflare API, D1 `GET /d1/database` HTTP 200/AUTHORIZED, R2 `GET /r2/buckets` HTTP 403 mã **10042**; Google Web Client `NMH_V3_GOOGLE_CLIENT_ID` chưa cấu hình.
- **Kết luận lỗi R2:** mã **10042 / NotEntitled** theo tài liệu chính thức Cloudflare nghĩa là tài khoản chưa có R2 subscription/entitlement, **không kết luận là token R2 thiếu quyền**. Cloudflare yêu cầu chủ tài khoản vào `Storage & databases → R2 → Overview` và hoàn thành kích hoạt R2; có bước billing nên **không được AI tự đồng ý chi phí**.
- **Cấp phát D1 độc lập đã thành công:** [Actions 43459579821](https://github.com/hvnm1206/TikTak-Service/actions/runs/43459579821) job `d1-bootstrap` SUCCESS; resource `nmh-voice-v3`, UUID **`3ce295cb-a84d-4a50-abee-d14fdd903514`**. Tạo bằng API Cloudflare với token cấp mới và đúng Account ID `769c2ab4af5ad50700039d473a72d48e`.
- D1 migration `voice-deploy/migrations/0001_v3.sql` đã chạy **11 SQL statements**, sau đó truy vấn từ D1 remote bảng `v3_sessions`: `V3_D1_MIGRATION=PASS`, `V3_D1_PROVISIONED_AND_VERIFIED=PASS`. Không tạo dữ liệu cá nhân thực; không thay Worker production.
- Workflow cấp D1 an toàn/idempotent được lưu `.github/workflows/nmh-voice-v3-d1-bootstrap.yml`. Chạy tự động theo push thay đổi chính file này, KHÔNG auto-deploy ứng dụng.
- **Còn phải làm:** (1) chủ tài khoản kích hoạt R2 subscription theo điều khoản Cloudflare; (2) chạy lại kiểm tra R2 và provision bucket `nmh-voice-v3-docs`; (3) tạo Google OAuth **Web Client** dành riêng ứng dụng, JavaScript Origin `https://nmh-voice-gpt-test.magical-budget.workers.dev`, thiết lập `NMH_V3_GOOGLE_CLIENT_ID`; (4) chạy pre-deploy/guarded release đúng Worker, test đăng nhập và đồng bộ hai thiết bị thật, ghi nhớ có lệnh, tài liệu. PDF/DOCX/OCR chưa được hiện thực hóa; không gắn PASS.
- **Giới hạn nghiệm thu:** D1 database/schema PASS là kết quả hạ tầng, **không phải** xác nhận người dùng đã đồng bộ thực tế. Production vẫn NMH Presence V2, chưa kích hoạt V3.

---

## NMH VOICE V3 — TRẠNG THÁI THỰC HIỆN 13/11/2026 (CHƯA RELEASE)

**Mục tiêu đã được người dùng duyệt:** đồng bộ Google Sign-In → D1/R2 → chỉnh Prompt tính cách → chỉ ghi nhớ khi nhập tay/ra lệnh rõ → tra cứu tài liệu riêng có nguồn. Giữ URL/Voice/Presence.

**Đợt 0 — kiểm tra quyền thật: CHƯA ĐẠT.** NMH Guarded Operator preflight PASS (Operator 0.5.16), Google OAuth Operator READY nhưng **không phải Google Web Client của NMH Voice**. [CI preflight 43451910768](https://github.com/hvnm1206/TikTak-Service/actions/runs/43451910768): token Workers vẫn deploy được, nhưng **D1 list HTTP 401 mã 10000**, **R2 list HTTP 403 mã 10000**, GitHub secret `NMH_V3_GOOGLE_CLIENT_ID` **NOT_CONFIGURED**. Không thể khẳng định database/bucket hoặc người dùng Google Sign-In đã tồn tại.

**Đã làm ở mã nguồn (staged, KHÔNG deploy):**
- `v3-backend.js`: Google ID token RS256 kiểm chữ ký JWKS, `aud/iss/exp/sub`; phiên HttpOnly Secure SameSite=Lax, mã phiên sinh ngẫu nhiên chỉ lưu hash SHA-256 trong D1, logout thu hồi phiên; D1 luôn giới hạn dữ liệu theo Google `sub`, không tin `user_id` từ client.
- `v3-ui.js`: SETUP mới với Prompt tính cách tự do + 3 mẫu chỉnh tiếp; ghi nhớ xem/thêm/sửa/xóa; đăng nhập và danh mục tài liệu; tự báo **chưa kích hoạt** nếu thiếu hạ tầng.
- `worker.js` + `agent-v2.js`: nối UI/API V3 vào Worker V2, quy tắc chỉ ghi nhớ từ lệnh rõ, không tự tích lũy chat; khi hỏi đưa Prompt + ghi nhớ liên quan + tối đa 4 đoạn tài liệu phù hợp vào GPT, gắn tên file/đoạn; lỗi DB không được giả vờ đã tra cứu.
- `migrations/0001_v3.sql`: users/sessions/profiles/memories/documents/chunks; `v3_documents` và `v3_chunks` tách theo chủ tài khoản.
- Tài liệu **TXT/Markdown**: nội dung lưu R2, chia đoạn và lập chỉ mục D1; **PDF/DOCX/OCR chưa đạt**, giao diện ghi rõ, không nhận vơ đã xử lý.
- `.github/workflows/nmh-voice-v3-capability.yml` kiểm tra quyền chỉ đọc; `nmh-voice-v3-provision.yml` chuẩn bị cấp phát khi token có quyền; `nmh-voice-v3-release.yml` chỉ chạy chủ động, snapshot active version/health + rollback.
- **CI cuối đã xem:** [GitHub Actions 43456270025](https://github.com/hvnm1206/TikTak-Service/actions/runs/43456270025), 26/26 Voice V2 PASS + 6/6 V3 PASS, schema SQLite PASS, cú pháp 2 workflow YAML PASS, token deploy ACTIVE, **ACTIVE_VERSION_ID=abcac5e5-0749-45ac-8c94-1d1bed49df82**; deploy SKIPPED. Đây là **mock tests**, không phải Google/iPhone E2E.

**Điều kiện khách quan đang chặn:**
1. Cấp API token Cloudflare đúng account Magical Budget có **D1 Edit và R2 Edit**, lưu vào GitHub Actions secret `NMH_V3_CF_PROVISION_TOKEN` (không gửi token trong chat); giữ token Worker đang chạy.
2. Tạo **Google OAuth Web Application Client** với Authorized JavaScript Origin `https://nmh-voice-gpt-test.magical-budget.workers.dev`, lưu client ID tại GitHub Actions secret `NMH_V3_GOOGLE_CLIENT_ID` (không tự lấy OAuth client của Operator làm web-client).
3. Sau đó mới chạy gate **inspect → provision/migrate → release** trên workflow V3 và test thực iPhone + máy tính, sửa Prompt, lưu/sửa/xóa ghi nhớ, hỏi đúng tài liệu với nguồn, thử cách ly hai tài khoản, kiểm phí và rollback.
4. **Không được** deploy trước khi đủ quyền hoặc tự thay thế D1/R2 bằng backend khác mà chưa được người dùng chấp thuận.

**Mức đạt hiện tại:** đã tạo source + kiểm thử tiền triển khai; **chưa có đồng bộ thật**, chưa có Google Sign-In chạy thật, chưa upload/tra cứu file thật, chưa nghiệm thu PDF/DOCX. Production Presence V2 được giữ nguyên.

Bằng chứng/chi tiết: [V3_STATUS_2026-11-13.md](voice-deploy/V3_STATUS_2026-11-13.md).

---

**Chốt cập nhật: 13/11/2026.** Đây là phần tổng hợp hiện trạng *mới nhất*, phải đọc trước các bản ghi V1/V2 cũ bên dưới. Mọi kết luận quan trọng phải đối chiếu source, GitHub Actions và Worker thực tế.

## A. HIỆN TRẠNG ĐANG CHẠY — NMH PRESENCE V2.1

### 1. Nền tảng, quyền và phiên bản
- URL chính thức: https://nmh-voice-gpt-test.magical-budget.workers.dev/ (giữ nguyên URL cũ trên iPhone).
- Cloudflare account: **Magical Budget**; Account ID `769c2ab4af5ad50700039d473a72d48e`; Worker `nmh-voice-gpt-test`. Không tạo Worker temporary.
- GitHub `hvnm1206/TikTak-Service`, chỉ cập nhật nhánh `nmh-voice-gpt-v1`, không động `main`.
- **Production đang chạy sau ổn định đường đọc tài liệu:** Cloudflare version `abcac5e5-0749-45ac-8c94-1d1bed49df82`; source release commit `e2b08266120df63840c516cc05e9f48cab7ac1a1`. [Actions run 43440716438](https://github.com/hvnm1206/TikTak-Service/actions/runs/43440716438): **SUCCESS**, CI **26/26 PASS**, smoke HEALTH / UI PRESENCE / DOCS mới nhất / SECURITY **PASS**. Bản trước: [43439620111](https://github.com/hvnm1206/TikTak-Service/actions/runs/43439620111), version `e6cb6c6d-064c-413e-8a12-93cf4873fa00`.
- Rollback baseline trước release gần nhất: `e6cb6c6d-064c-413e-8a12-93cf4873fa00` được xác nhận **HEALTH_VERIFIED**. Workflow có đường `wrangler rollback` nếu lỗi; chưa có bằng chứng diễn tập rollback của đúng bản Presence hiện hành, do release đạt smoke.
- GitHub HEAD được đối chiếu trước cập nhật bảo trì: `911bde3f4cd9365d27c4ef2ee1ab718f1fddbdf1` (commit tài liệu, **không phải** version triển khai). Actions `43437150330` verify SUCCESS, deploy SKIPPED.
- NMH Guarded Operator preflight `0.5.16`: PASS. Đã trực tiếp kiểm tra `GET /health`, `GET /`, `GET /api/docs/maintenance` và cả ba trả **HTTP 200**.
- Health xác thực: `ok=true`, `app=NMH Voice GPT V2`, `voice=browser-stt+marin-tts`, `agent=gpt-6-luna`, `version=v2-tts-audioctx`, `uiVersion=presence-canvas-v1`. Trang chính có các marker `avatar`, `journalBtn`, `subsBtn`, `getByteTimeDomainData`.

### 1b. Đồng bộ tài liệu BẢO TRÌ sau lần cập nhật này
- File `MAINTENANCE.md` được cập nhật đầy đủ trên GitHub commit `e79913ba4cce262fc63ce64de929e389bbad0815` (20.893 ký tự, giữ lịch sử cũ). GitHub Contents API và Raw đều xác nhận có phần tổng hợp A và F01–F16.
- Phát hiện: sau khi commit tài liệu, Worker `/api/docs/maintenance` còn trả bản cũ 12.302 ký tự dù HTTP 200. Đã thay nguồn đọc từ GitHub Raw CDN sang GitHub Contents API (UTF-8/base64), bổ sung test Unicode, payload base64 có xuống dòng, lỗi trả 502 thay vì giả vờ tài liệu mới.
- CI `43439488614` **24/24 PASS** trước release. Release `43439620111` smoke xác minh **bản bảo trì mới** (`DEPLOY_DOCS=CANONICAL_AND_CURRENT_OK`) và không thay STT/GPT/TTS/Face.
- **Bằng chứng live bổ sung:** sau release, probe độc lập `GET /api/docs/maintenance` từng trả **HTTP 502** (chưa xác định được lỗi mạng/API GitHub), lần kiểm tra sau trả **HTTP 200** và đúng phần A bản mới. Vì vậy **không khẳng định đường đọc tài liệu ổn định tuyệt đối** nếu chưa đo lặp lại; sự cố HTTP 502 đã ghi nhận để tiếp tục điều tra, không đánh dấu resolved.
- Nội dung bên trong ứng dụng lấy trực tiếp từ GitHub nên commit chỉ sửa tài liệu `MAINTENANCE.md` tiếp theo **không cần deploy Worker**. Sau update phải kiểm tra app thực tế trả phiên bản mới; không lấy HTTP 200 đơn lẻ làm bằng chứng cập nhật thành công.

### 1c. Sửa HTTP 403/502 và nghiệm thu đường đọc tài liệu
- **Lỗi thực đã xác định:** GitHub Contents API ẩn danh đôi khi trả **HTTP 403**, khiến Worker `/api/docs/maintenance` trả **HTTP 502** dù GitHub source đúng. Không phải lỗi GPT, TTS hoặc source tài liệu.
- Sửa `worker.js`: dùng cache Cloudflare edge tài liệu công khai TTL 120 giây, giảm lượt gọi API; nếu API lỗi thử raw.githubusercontent.com; **chỉ trả raw fallback khi có marker phiên bản hiện trạng**, không chấp nhận tài liệu lịch sử làm bản mới. Nếu mọi nguồn không đạt, trả 502 có hướng mở link GitHub; không âm thầm giả mạo thành công. Cache có thể khiến thay đổi tài liệu mới trễ tối đa khoảng 120 giây tại điểm phục vụ còn cache.
- Thêm 2 test: API 403 → raw fallback đã kiểm chứng PASS, Raw cũ → HTTP 502 PASS. Lỗi test cũ do assertion URL đã được sửa trước release. CI cuối **26/26 PASS**.
- [Release cuối 43440716438](https://github.com/hvnm1206/TikTak-Service/actions/runs/43440716438): SUCCESS, `DEPLOY_HEALTH=V2_OK`, `DEPLOY_UI=PRESENCE_CANVAS_OK`, `DEPLOY_DOCS=CANONICAL_AND_CURRENT_OK`, `DEPLOY_SECURITY=VALIDATION_OK`, `DEPLOY_FINAL=SUCCESS`. Cloudflare active version `abcac5e5-0749-45ac-8c94-1d1bed49df82`; rollback snapshot `e6cb6c6d-064c-413e-8a12-93cf4873fa00`.
- **Kiểm chứng độc lập sau release:** 5 lượt GET `/api/docs/maintenance` liên tiếp qua NMH Guarded Operator đều **HTTP 200, đủ 22.422 ký tự**, có phần hiện trạng A và nhận xét của người dùng; không có HTTP 502 trong loạt 5 lượt này. Kết quả này không bảo đảm tuyệt đối cho mọi Cloudflare edge hay mọi thời điểm.
- URL chính thức, khuôn mặt Presence, nguồn AI/voice, SETUP, dữ liệu key và công cụ còn giữ nguyên. Không gửi API key và không tính thêm phí AI để tải tài liệu.

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

## B. NHẬT KÝ LỊCH SỬ — LƯU TRỮ ĐẦY ĐỦ

Nhật ký cũ đã được lưu nguyên văn tại `voice-deploy/archive/MAINTENANCE_FULL_20261114.md` (lưu trữ ngày 14/11/2026). Không xóa lịch sử; phần hiện hành ở trên được ưu tiên khi xác định trạng thái production.
