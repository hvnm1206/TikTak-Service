# BÀN GIAO NGỐ — TRẠNG THÁI CHÍNH THỨC 14/11/2026

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


## 1. Đọc trước khi sửa
- URL chính giữ nguyên: https://nmh-voice-gpt-test.magical-budget.workers.dev/
- Worker `nmh-voice-gpt-test`, Cloudflare account `769c2ab4af5ad50700039d473a72d48e`.
- Production Worker version **`fa391d70-0eaa-4e7d-8643-1943e119619e`** đã deploy. Rollback code target **`d0622605-7d01-47ba-a5aa-bbb7e5262ee9`**.
- D1 `nmh-voice-v3` ID `3ce295cb-a84d-4a50-abee-d14fdd903514`, D1 Time Travel bookmark trong artifact của release GitHub Actions (retention 30 ngày).
- **Nguồn deploy:** https://github.com/hvnm1206/TikTak-Service/tree/nmh-voice-actions-reminders-p0-20261114 ; nhánh `nmh-voice-gpt-v1` CHỈ phục vụ docs, không lấy source code từ nhánh này để deploy.
- Production release evidence: https://github.com/hvnm1206/TikTak-Service/actions/runs/43586216466 — PASS, 99/99 tests, post-deploy smoke/rollback gate.
- Cloudflare sandbox isolated D1/rollback: https://github.com/hvnm1206/TikTak-Service/actions/runs/43586024270 — PASS.

## 2. Kiến trúc hoạt động
- 1 input Voice hoặc Text → GPT nhận ngữ nghĩa và chọn công cụ → backend xác thực Google subject, thực hiện D1 và đọc lại → xác nhận dựa trên receipt → Marin TTS.
- Tools: `save_memory`, `save_note`, `update_memory`, `delete_memory`, `read_memories`, `set_reminder`, `list_reminders`, `cancel_reminder`; công cụ public search như trước.
- Đã xóa đường regex classifier/trợ lý phân loại ghi chú và lưu Memory song song, xóa đặc thù quan hệ gia đình; không hardcode câu người dùng/tên/ngành.
- Memory retrieval: 20 bản ghi gần đây + công cụ `read_memories` 50 bản ghi/trang, đúng owner. Đây không phải vector retrieval đã nghiệm thu trên kho rất lớn.
- Receipt Guard: không báo lưu thành công nếu D1 không xác nhận; lỗi `TURN_MISMATCH` không chiếm chỗ của câu hỏi bình thường.
- Không sửa micro, Marin, giao diện default/Vịt/Corgi, Google OAuth, Memory V2 hay Ngáo. Reminder chỉ phát khi ứng dụng còn mở (foreground only).

## 3. Sự cố đã xử lý
- Triệu chứng ghi Memory bị nhầm Reminder và đòi giờ: do nhiều bộ phân loại/regex chồng chéo. Dọn sạch và sử dụng GPT semantic tools chung.
- CI sau đó phát hiện khả năng GPT xác nhận giả sau write failure: đã chặn bằng receipt.
- Hai lần rollout hotfix đầu bị rollback bởi hardcode tiêu đề `MAINTENANCE.md` của bản cũ trong GitHub Raw fallback và smoke; đã sửa: kiểm cấu trúc Markdown chung, gắn nhãn `freshness-unverified` khi nguồn fallback, smoke vẫn kiểm HTTP 200. Bản cuối PASS.

## 4. Bằng chứng và việc còn lại
- Guarded Operator sau deploy: `/health` HTTP 200 `semantic-actions-d1-readback-v1`, `/api/v3/config` 200 READY D1, `/api/reminders/capabilities` 200 enabled true, `/api/docs/maintenance` 200.
- **CHƯA NGHIỆM THU**: iPhone thực có Google login và BYOK OpenAI, nói tự nhiên save/refresh/read/edit/delete, speech+Marin, reminder đúng giờ, theme; khả năng model thật chọn tool đúng trên lời nói chưa từng thử. Không gọi bản này là 7/7 PASS cho tới khi có bằng chứng.
- Mọi lỗi từ thực địa phải có time, HTTP, actionErrorCode (nếu có), phạm vi user, truy dữ liệu read-only; không thêm regex vá câu.

## 5. Tài liệu giữ lại
- [MAINTENANCE hiện hành](https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-gpt-v1/MAINTENANCE.md)
- [Nhật ký 7 cổng thực thi](https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-actions-reminders-p0-20261114/voice-deploy/NGO_REBUILD_7_GATE_EXECUTION_20261114.md)
- [Bàn giao đầy đủ trước tinh gọn](https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-gpt-v1/voice-deploy/archive/START_HERE_PRE_UNIFIED_20261114.md), lưu nguyên văn.
- [MAINTENANCE lịch sử](https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-gpt-v1/voice-deploy/archive/MAINTENANCE_PRE_UNIFIED_20261114.md), lưu nguyên văn.
