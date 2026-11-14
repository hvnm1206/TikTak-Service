# NMH VOICE GPT — BẢO TRÌ HIỆN HÀNH (14/11/2026)

## HIỆN HÀNH 14/11/2026 — SỬA LƯU PROMPT MỚI VÀ SỬA PROMPT

- **Worker production chính:** `nmh-voice-gpt-test` — https://nmh-voice-gpt-test.magical-budget.workers.dev/ ; **version `c35801d0-a840-4d4c-adc1-155c6070489a`**. Mốc rollback code **`c1755bd1-5e2a-4af8-b542-d4557446cef4`**.
- **Triệu chứng:** người dùng phản ánh bấm LƯU PROMPT trong TÍNH CÁCH — PROMPT không lưu được nội dung mới hoặc sửa. Ảnh hiển thị textarea và nút nhưng không cung cấp HTTP/D1 log, vì vậy nguyên nhân cụ thể của lần lỗi cá nhân chưa xác định độc lập.
- **Lỗ hổng đã xác minh trong source cũ:** phản hồi lưu chỉ dựa vào PUT 200, không kiểm D1 readback; thông báo nằm xa nút ở cuối khu setup; hàm refresh có thể ghi đè nội dung đang nhập. Revision conflict 409 không được hướng dẫn ngay tại chỗ.
- **Khắc phục:** backend D1 INSERT/UPDATE owner-scoped theo revision, đọc lại đúng chuỗi Prompt và revision trước khi phát receipt `ok:true,verified:true`; trả 409 nếu đã bị sửa ở thiết bị khác, 503 nếu không xác minh được. Giao diện thêm status dưới nút LƯU PROMPT, hiển thị ĐANG LƯU / ĐÃ LƯU VÀ ĐỌC LẠI THÀNH CÔNG / CHƯA LƯU ĐƯỢC; giữ bản nháp khi lỗi hoặc refresh, chặn bấm trùng, kiểm lại server lần hai trước khi báo đạt.
- **Kiểm thử:** 114/114 bài PASS [CI #43612304741](https://github.com/hvnm1206/TikTak-Service/actions/runs/43612304741). Cloudflare Worker+D1 **thật, tách biệt** kiểm create/edit/GET/readback/409 và rollback exact version, cleanup PASS [sandbox #43612304708](https://github.com/hvnm1206/TikTak-Service/actions/runs/43612304708). [Release production #43612444869](https://github.com/hvnm1206/TikTak-Service/actions/runs/43612444869) SUCCESS, có D1 Time Travel bookmark artifact.
- **Guard độc lập sau deploy:** GET URL Ngố chính HTTP 200, xác minh các marker status/nút save/đọc lại cùng SpeechRecognition và QR vẫn còn trong HTML.
- **Chưa nghiệm thu:** chưa kiểm trực tiếp một lượt save→refresh→hỏi lại trong phiên Google cá nhân trên iPhone của người dùng. Không tự nhận đã xác minh dữ liệu thật của người dùng; không chỉnh dữ liệu production của người dùng.
- **Hướng dẫn:** SETUP → chỉnh Prompt → LƯU PROMPT → nhìn status ngay dưới nút. Chỉ coi đã lưu khi thấy **ĐÃ LƯU VÀ ĐỌC LẠI THÀNH CÔNG**. Nếu báo 409, nội dung đang gõ vẫn giữ, kiểm tra thay đổi từ thiết bị khác rồi chọn lưu lại.
- **Nhật ký kỹ thuật:** https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-actions-reminders-p0-20261114/voice-deploy/NGO_PROMPT_SAVE_FIX_20261114.md

**Những mục version bên dưới chỉ là lịch sử**, không dùng làm baseline phát hành. Không sửa Ngáo, mic, Marin, GPT, D1 schema, Memory hoặc nhắc việc trong lần fix này.

---


## TRẠNG THÁI CHÍNH THỨC — QR MỞ APP TRONG SETUP (14/11/2026)

- **App Ngố chính:** https://nmh-voice-gpt-test.magical-budget.workers.dev/
- **Cloudflare Worker:** `nmh-voice-gpt-test` — production version **`c1755bd1-5e2a-4af8-b542-d4557446cef4`**. Rollback code version **`4f2c3cd2-e814-41f1-87da-85dc6e371079`**.
- **Mới cập nhật:** SETUP (Cài đặt) có mục mở sẵn **MÃ QR MỞ NGỐ TRÊN ĐIỆN THOẠI**: mã QR trắng/đen, link bấm trực tiếp và nút **SAO CHÉP LINK**. Mã QR chỉ chứa URL công khai ở trên, không kèm API key, danh tính hay dữ liệu riêng. Không gọi dịch vụ QR ngoài, hoạt động khi ứng dụng tải xong.
- **Kiểm định QR:** ma trận QR phiên bản 4, mức sửa lỗi M, viền trắng 4 module, đã giải mã bằng OpenCV ra đúng URL. SHA256 ma trận `9aa11ca4324cf0479d963dd15c73793348d28088ebe499bb901883b9743ff026`.
- **Chứng cứ kỹ thuật:** 114/114 bài kiểm thử PASS [CI #43610054668](https://github.com/hvnm1206/TikTak-Service/actions/runs/43610054668); [sandbox Cloudflare Worker+D1 rollback #43610054623](https://github.com/hvnm1206/TikTak-Service/actions/runs/43610054623) PASS; [production Guard release #43610159478](https://github.com/hvnm1206/TikTak-Service/actions/runs/43610159478) PASS. Guarded Operator GET chính URL production trả HTTP 200, xác nhận mã QR/link/copy cùng phần nhận giọng nói và AudioContext vẫn phục vụ trong HTML.
- **Không thay đổi trong lần này:** micro, GPT-6 Luna, Marin TTS, mức âm lượng, tìm kiếm, Memory/D1, OAuth, nhắc việc 10 phút và các skin đôi mắt. Ngáo là sản phẩm riêng, không sửa.
- **Còn cần nghiệm thu trên thiết bị:** quét QR bằng camera iPhone thực, mở Safari/app đúng URL; xác minh camera không báo lỗi, bố cục SETUP và âm thanh/mic thông thường. Không khẳng định đã PASS iPhone nếu chưa thấy kết quả thực.
- **Đặc tả + nhật ký QR:** https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-actions-reminders-p0-20261114/voice-deploy/NGO_SETUP_QR_RELEASE_20261114.md

### Tổng kết tình trạng Ngố sau các đợt nâng cấp 14/11/2026

1. **Voice:** Safari SpeechRecognition → GPT-6 Luna/Responses → Marin; đã có chỉ số thời gian GPT/API, D1, TTS và tiếng đầu trong SETUP. Kiến trúc vẫn chờ GPT hoàn thành văn bản trước khi TTS phát tiếng đầu; chưa streaming hoàn toàn.
2. **Giao diện:** Mặc định + Mắt Ngố/Mắt Vịt/Mắt Corgi dùng chung động cơ mắt chớp và nhìn theo trạng thái; vừa bổ sung QR chia sẻ ngay trong SETUP.
3. **Dữ liệu cá nhân:** Google OAuth và Cloudflare D1; công cụ ghi chú/ghi nhớ/đọc/sửa/xóa có xác thực và kiểm chứng D1. Chất lượng truy xuất ghi nhớ cũ trên dữ liệu lớn chưa đạt chứng minh tìm kiếm ngữ nghĩa toàn diện.
4. **Tìm kiếm:** OpenAI Web Search, Wikipedia/RSS và Open-Meteo dự báo 7 ngày; đã kiểm tra nguồn thời tiết công khai có ngày mai. Chưa có nghiệm thu GPT chọn công cụ đúng cho mọi câu hỏi thoại thực.
5. **Âm thanh:** Marin đã bỏ compressor cũ và có cân biên độ từng đoạn; nghe qua loa iPhone nhiều lượt chưa được nghiệm thu; phát nhắc việc vẫn qua đường audio riêng.
6. **Nhắc việc:** đã tăng polling từ 10 giây lên 10 phút, giảm 60 lần các yêu cầu định kỳ; foreground-only, có thể trễ và không nhắc được nếu ứng dụng đóng.
7. **Chi phí:** OpenAI API theo key do người dùng nhập; Cloudflare do chủ Worker thanh toán. Bảng ước tính nội bộ theo thiết bị không thay thế hóa đơn. [Audit tổng thể & ước phí](https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-actions-reminders-p0-20261114/voice-deploy/NGO_FULL_AUDIT_AND_COST_20261114.md).
8. **Guard:** production version pin, sandbox Worker+D1, CI regression và rollback có bằng chứng; riêng nghiệm thu iPhone (giọng nói, độ trễ, âm lượng, quét QR) chưa được chứng minh tự động.

**Nguồn chuẩn triển khai:** branch `nmh-voice-actions-reminders-p0-20261114`. Branch `nmh-voice-gpt-v1` chỉ dành cho tài liệu BẢO TRÌ/bàn giao; không lấy làm source phát hành. Các phiên bản cũ ghi phía dưới là **lịch sử**, không phải production hiện hành.

---


## MỚI NHẤT — NHẮC VIỆC 10 PHÚT (14/11/2026)
- Ngố chính: https://nmh-voice-gpt-test.magical-budget.workers.dev/ ; Worker production version **`4f2c3cd2-e814-41f1-87da-85dc6e371079`** ; rollback code **`c53ec4d6-ed9f-4dd2-9f79-76cdfdd8505d`**.
- Người dùng chọn giữ nhắc việc và nới chu kỳ **10 giây → 10 phút**; giữ kiểm tra lúc mở app, lúc quay lại app nếu đã qua >=60 giây, ngăn các lệnh kiểm tra chồng lặp. Không xóa lời nhắc/D1; không thay micro, Marin, GPT, Memory.
- Giảm polling định kỳ từ 8.640 xuống 144 lần/ngày trên một máy mở liên tục (60 lần); nhắc việc **có thể trễ tối đa gần 10 phút** nếu app mở liên tục và chưa có tương tác quay lại. Vẫn là foreground-only.
- CI **111/111 PASS**, sandbox/rollback PASS, deploy và kiểm tra production PASS: https://github.com/hvnm1206/TikTak-Service/actions/runs/43604249247 .
- Chi phí TTS Marin cần hiểu chính xác: OpenAI tính theo token văn bản ($0,60/1M) và token âm thanh đầu ra ($12/1M); khoảng $0,015/phút chỉ là đơn giá ước tính, không phải phí cố định hoặc làm tròn lên một phút. Nguồn: https://developers.openai.com/api/docs/models/gpt-4o-mini-tts.
- Tài liệu chi tiết: https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-actions-reminders-p0-20261114/voice-deploy/NGO_REMINDER_POLL_10MIN_20261114.md


## MỚI NHẤT 14/11/2026 — SỬA DỰ BÁO NGÀY MAI VÀ ÂM LƯỢNG MARIN
- Worker chính: https://nmh-voice-gpt-test.magical-budget.workers.dev/ — production version **`c53ec4d6-ed9f-4dd2-9f79-76cdfdd8505d`**. Rollback code **`c547c24a-ff0a-4b6d-afe4-1bbdd80d23d9`**.
- Lỗi thời tiết: công cụ `get_weather` trước chỉ lấy `current`. Đã yêu cầu thêm 7 ngày `daily`: ngày địa phương, nhiệt độ max/min, xác suất và lượng mưa, gió, WMO code, đơn vị. Ngày mai phải lấy dự báo của đúng ngày, không lấy current thay thế. Không có daily thì công cụ báo lỗi, không bịa dữ liệu.
- Kiểm nguồn công khai thực: Guarded Operator GET Open-Meteo geocoding Hà Nội HTTP 200, forecast endpoint HTTP 200 với `2026-11-15` và các giá trị daily; chưa có test GPT real API của phiên iPhone.
- Âm lượng: bỏ bộ nén động gây nguy cơ dao động mức âm; thay gain tuyến tính theo RMS PCM của từng đoạn Marin và giới hạn đỉnh 0.88 không clipping; giữ nút volume, mic và nhịp TTS như cũ. Đây là thay đổi kỹ thuật có test waveform, chưa xác nhận cảm giác nghe trên iPhone.
- CI **110/110 PASS** https://github.com/hvnm1206/TikTak-Service/actions/runs/43601366567 ; sandbox D1/Worker và rollback PASS https://github.com/hvnm1206/TikTak-Service/actions/runs/43601510075 ; production release SUCCESS https://github.com/hvnm1206/TikTak-Service/actions/runs/43601602098 ; D1 Time Travel bookmark được lưu trong artifact của release.
- Bài thử iPhone chưa xác minh: hỏi “Thời tiết Hà Nội ngày mai thế nào?” (đúng ngày dự báo), thử nghe một đoạn dài nhiều phần Marin, thay đổi volume trong SETUP, thử ngắt lời và micro. Nếu còn lỗi phải ghi nhận thông số/lỗi thực, không vá theo từng câu hỏi.
- Báo cáo kỹ thuật: https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-actions-reminders-p0-20261114/voice-deploy/NGO_WEATHER_VOLUME_REPAIR_20261114.md


## MỚI NHẤT 14/11/2026 — GIẢM THỜI GIAN ĐẾN TIẾNG NÓI ĐẦU TIÊN
- URL chính giữ nguyên: https://nmh-voice-gpt-test.magical-budget.workers.dev/ ; Cloudflare Worker version `c547c24a-ff0a-4b6d-afe4-1bbdd80d23d9`. Rollback version `f24ae459-324a-4aef-96d0-7713454d62e4`.
- Thêm SETUP → ĐỘ TRỄ: đo từ khi Safari nhận xong câu nói đến GPT/API trả lời, Marin tạo tiếng đầu, tổng và thời gian backend D1/GPT. Không gửi nội dung voice hoặc API key vào log; số liệu theo lượt trên thiết bị.
- Chia phần giọng đầu Marin tối đa 180 ký tự thay 440 khi câu đầu dài; các phần sau 440 như cũ. Nội dung và thứ tự nguyên văn không mất, cơ chế Marin prefetch và ngắt lời giữ nguyên. **GPT vẫn phải trả xong toàn bộ câu trả lời trước khi Marin được gọi**, chưa phải streaming chồng lấn hoàn toàn.
- CI **104/104 PASS**: https://github.com/hvnm1206/TikTak-Service/actions/runs/43599883353 ; Cloudflare sandbox Worker+D1, rollback/cleanup PASS: https://github.com/hvnm1206/TikTak-Service/actions/runs/43599883356 ; production release, D1 bookmark và smoke PASS: https://github.com/hvnm1206/TikTak-Service/actions/runs/43599996114.
- UAT iPhone: nói một câu → mở SETUP đọc ĐỘ TRỄ (GPT/API, Marin → tiếng đầu, tổng, Memory/D1, GPT server). So sánh ít nhất 3-5 lượt thường và có tìm kiếm, kiểm ngắt lời, mic, âm thanh, theme, Memory/nhắc việc. **Chưa có số đo iPhone để tuyên bố tiết kiệm được bao nhiêu giây**.
- Đặc tả/test: https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-actions-reminders-p0-20261114/voice-deploy/NGO_LATENCY_V1_20261114.md


## CẬP NHẬT MỚI NHẤT — NGỐ ĐÔI MẮT SINH ĐỘNG (14/11/2026)
- Worker chính giữ nguyên https://nmh-voice-gpt-test.magical-budget.workers.dev/ , production version **`f24ae459-324a-4aef-96d0-7713454d62e4`**; rollback version `fa391d70-0eaa-4e7d-8643-1943e119619e`.
- SETUP → GIAO DIỆN NGỐ: Mặc định (canvas Presence nguyên bản), Mắt Ngố, Mắt Vịt, Mắt Corgi. Ba theme mới **chỉ có đôi mắt lớn**, đồng tử chuyển động theo chạm, mắt chớp, nhìn theo trạng thái nghe/nghĩ/nói; không xoay mặt nạ; hỗ trợ reduced motion.
- Source sửa đúng lớp UI `voice-deploy/theme-ui.js`; giữ nguyên micro, Marin, GPT, D1, Memory, Reminder và Ngáo.
- CI **101/101 PASS** https://github.com/hvnm1206/TikTak-Service/actions/runs/43588435662 ; sandbox Worker+D1 và rollback PASS https://github.com/hvnm1206/TikTak-Service/actions/runs/43587884426 ; deploy production có baseline pin và D1 bookmark PASS https://github.com/hvnm1206/TikTak-Service/actions/runs/43588003169 .
- Guarded Operator độc lập GET đúng URL production HTTP 200, HTML có theme selector, ngo-eye/ngo-iris, blink engine và SpeechRecognition.
- **Chưa kiểm chứng Safari iPhone thật**, cần người dùng đánh giá mắt, chuyển theme, mic/Marin thực tế. Không tự tuyên bố nghiệm thu thiết bị.
- Đặc tả & kết quả: https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-actions-reminders-p0-20261114/voice-deploy/NGO_EYES_ONLY_V1_20261114.md .


## 1. Production đã kiểm chứng
- URL giữ nguyên: https://nmh-voice-gpt-test.magical-budget.workers.dev/
- Cloudflare Worker: `nmh-voice-gpt-test`
- Phiên bản phát hành: `fa391d70-0eaa-4e7d-8643-1943e119619e`
- Version rollback tức thời: `d0622605-7d01-47ba-a5aa-bbb7e5262ee9`
- D1 production: `nmh-voice-v3` (ID `3ce295cb-a84d-4a50-abee-d14fdd903514`).
- Source: [GitHub branch](https://github.com/hvnm1206/TikTak-Service/tree/nmh-voice-actions-reminders-p0-20261114).
- Release CI: https://github.com/hvnm1206/TikTak-Service/actions/runs/43586216466 — SUCCESS; 99/99 regression PASS, prior version gate PASS, D1 Time Travel bookmark được lưu artifact 30 ngày và rollback có cấu hình.
- Sandbox Cloudflare Worker + D1 thật: https://github.com/hvnm1206/TikTak-Service/actions/runs/43586024270 — SUCCESS, kiểm tra migration, quyền truy cập, reminder claim, rollback và cleanup.
- Sau deploy, Guarded Operator GET `/health` HTTP 200, `writeVersion=semantic-actions-d1-readback-v1`; GET `/api/v3/config` 200 `ready:true`; GET `/api/reminders/capabilities` 200 `enabled:true,foregroundOnly:true`. Lần kiểm tra health ban đầu còn nhãn cũ; gọi lại không cache và URL chuẩn đều đã ra nhãn mới.

## 1B. Sửa nguyên nhân gốc hậu phát hành
- Bảo đảm GPT không thể phủ định lỗi D1 bằng câu “đã lưu” không có receipt; `TURN_MISMATCH` không chặn trả lời câu hỏi thường. Có bài kiểm thử giả lập GPT cố báo lưu thành công sau D1 lỗi.
- Bỏ hardcode tiêu đề `## A. HIỆN TRẠNG ĐANG CHẠY` trong đường dự phòng GitHub docs và trong smoke test. Khi dùng bản Raw dự phòng, header `x-nmh-doc-source` báo rõ `github-raw-fallback-freshness-unverified`; không tự nhận dữ liệu mới đã được xác minh.
- Lần phát hành bị lỗi smoke đều tự rollback đúng bản `d062...`; bản cuối cùng 99/99 test PASS và Guard HTTP production/health/docs đều PASS.
- Mới xác minh backend và test mô phỏng OpenAI. **Nghiệm thu iPhone + key/API thực chưa có**.

## 2. Thay đổi kiến trúc — chỉ bản chính Ngố
- Xóa `voice-write.js`, `voice-write.test.mjs`, regex phân loại ý định từ lời nói và các luồng lưu ghi chú/ghi nhớ song song trong `/api/chat`.
- Xóa thuật toán ghép quan hệ theo từ khóa và prompt chuyên biệt về quan hệ gia đình. Không hardcode tên người, ngành hoặc câu người dùng.
- GPT chọn công cụ `save_memory`, `save_note`, `update_memory`, `delete_memory`, `read_memories`, `set/list/cancel_reminder`. Backend xác thực Google subject, validate dữ liệu, D1 readback và chỉ báo thành công khi có receipt thực.
- Memory không phụ thuộc cờ nhắc việc. `loadV3Context` cấp 20 ghi nhớ gần nhất; `read_memories` chỉ đọc theo trang (50 dòng/trang) để GPT truy xuất sâu hơn. Đây không phải vector/semantic retrieval đã kiểm chứng độ chính xác trên kho lớn.
- Không sửa Ngáo, không đổi URL, luồng micro/SpeechRecognition/Marin, giao diện Vịt/Corgi, tài liệu người dùng hoặc dữ liệu D1 hiện hữu.

## 3. Mức độ nghiệm thu và giới hạn
- **Đã xác minh:** CI tự động, D1 sandbox/rollback, deploy production, HTTP/feature flags và các bước bảo vệ.
- **Chưa xác minh:** Người dùng nói trên iPhone thật với Google session và API key cá nhân; GPT Responses API thật tự chọn công cụ cho câu mới; phát Marin đúng với từng kết quả; mức chính xác truy xuất Memory trên kho lớn.
- Nghiệm thu iPhone cần: nói lưu một thông tin bất kỳ → D1 xác nhận → refresh/hỏi lại; sửa/xóa; ghi chú; nhắc giờ tự nhiên; câu hỏi bình thường không ghi; thử micro, Marin, theme. Cấm tự tuyên bố PASS nếu chưa thấy bằng chứng thực tế.
- Nếu lỗi, giữ bản sao và xác minh ngay actionErrorCode, phiên Google, bản ghi D1, nguồn gọi OpenAI, log liên quan; không thêm regex vá câu.

## 4. Tài liệu lịch sử và nguồn
- [Nhật ký bảo trì ngay trước tái cấu trúc](https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-gpt-v1/voice-deploy/archive/MAINTENANCE_PRE_UNIFIED_20261114.md) — lưu nguyên văn, không xóa.
- [Bản lưu trữ kỹ thuật cũ](https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-gpt-v1/voice-deploy/archive/MAINTENANCE_FULL_20261114.md).
- [Kế hoạch và quá trình thực hiện 7 cổng](https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-actions-reminders-p0-20261114/voice-deploy/NGO_REBUILD_7_GATE_EXECUTION_20261114.md).
- [Tài liệu cửa mới](https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-gpt-v1/voice-deploy/START_HERE_NEXT_CHAT.md).

Nguyên tắc: trạng thái ở mục 1 là mốc hiện hành; mọi phiên bản trong tài liệu lưu trữ là lịch sử, không sử dụng làm baseline deploy nếu chưa đối chiếu Cloudflare.
