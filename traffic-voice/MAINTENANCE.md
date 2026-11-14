# NMH TRAFFIC VOICE V1 — NHẬT KÝ KỸ THUẬT VÀ BÀN GIAO

Ngày 14/11/2026.

## Kết quả đã kiểm chứng

- Guarded Operator `nmh_operator_preflight`: PASS; `0.5.16`, Google/Apps Script/n8n ready (không có nghĩa Maps Platform key đã được cấp).
- Đã khảo sát **chỉ đọc** Ngố production `https://nmh-voice-gpt-test.magical-budget.workers.dev/health`, HTTP 200, `browser-stt+marin-tts`, GPT `gpt-6-luna`.
- Nguồn phát hành Ngố đọc được: branch `nmh-voice-actions-reminders-p0-20261114`, trong `voice-deploy`. Không dùng nhánh docs `nmh-voice-gpt-v1` để tái dùng code.
- Đã xây dựng Traffic V1 **riêng**, Worker name `nmh-traffic-voice-v1`, không import hoặc viết Ngố.
- 17/17 kiểm thử với dữ liệu Google/OpenAI **giả lập** đạt trong môi trường Node 22. Các kiểm thử chống dùng lại GPS cũ tránh ETA 0 khi Maps thiếu trường bắt buộc và không bịa độ trễ khi thiếu staticDuration đã được thêm.
- Bước đóng gói Cloudflare Worker dry-run qua GitHub Actions **thành công** trên nhánh Traffic (mốc CI phải đối chiếu run gần nhất).
- Nguồn ứng dụng: `https://github.com/hvnm1206/TikTak-Service/tree/nmh-traffic-voice-v1-20261114/traffic-voice`.

## Điều kiện chưa có bằng chứng / chưa nghiệm thu

1. Chưa xác thực Maps Platform billing, Routes/Places API active và server key.
2. Chưa xác thực OpenAI API key có quyền và hạn mức.
3. ĐÃ tạo Worker Traffic riêng `nmh-traffic-voice-v1`; URL staging https://nmh-traffic-voice-v1.magical-budget.workers.dev/ . Guarded Operator kiểm tra trực tiếp `GET /health` HTTP 200 đúng tên, `mapsConfigured=false`, `aiConfigured=false`, `accessConfigured=false`, `rateLimiterConfigured=true`; trang HTML và `/api/config` HTTP 200; Ngố `/health` vẫn HTTP 200. Deployment CI lần đầu tạo worker thành công nhưng post-check sai câu `grep` nên CI báo fail; workflow sửa để chỉ kiểm tra Worker sẵn có và CI PASS: https://github.com/hvnm1206/TikTak-Service/actions/runs/43615018925 .
4. Chưa gửi request **thật** đến Places/Routes/OpenAI; số liệu trong unit test chỉ là mock.
5. Chưa đo độ trễ và chất lượng nhận giọng/loa trên iPhone Safari; chưa thử tiếng ồn xe trong điều kiện an toàn.
6. Chưa có log/chi phí phát sinh của Traffic.

## Tiếp tục cho tới sản phẩm cuối (không làm giả thành công)

- Cloudflare token `NMH_CF_API_TOKEN`: đã kiểm tra hợp lệ trong GitHub Actions; Worker mới tạo bằng đúng quyền này, không đụng Worker Ngố.
- Tại ngày 14/11/2026, GitHub Actions repo **chưa có** các secret `GOOGLE_MAPS_API_KEY`, `OPENAI_API_KEY`, `TRAFFIC_ACCESS_TOKEN`; do đó chưa gọi được API thật và chưa có phí Traffic phát sinh được xác nhận.
- Quy trình nạp khóa độc lập, KHÔNG xuất khóa ra log: `.github/workflows/traffic-voice-configure-secrets.yml`. Chỉ chạy lệnh `wrangler secret put` khi đủ cả ba key, nếu không `BACKEND_KEYS_NOT_READY=NO_CHANGES`; kết quả https://github.com/hvnm1206/TikTak-Service/actions/runs/43615146661 .
- Chủ sở hữu phải cấu hình quota/billing của Google Maps, rồi cấp secret cho repository GitHub; OpenAI key là API riêng, không phải key UI Ngố trên iPhone (không thể tự lấy). `TRAFFIC_ACCESS_TOKEN` tối thiểu 16 ký tự, chính người dùng giữ và điền trong SETUP của app sau khi backend đã nhận key. KHÔNG gửi key trong chat.
- Sau khi đủ key: chạy workflow nạp key, `GET /health` phải có cả ba cờ true và rate limiter true; thực hiện API live có ghi số lượng/billing, nghiệm thu Safari iPhone theo checklist phía dưới. Hiện **chưa đạt nghiệm thu cuối**.

## Test cần để xác nhận PASS đầu-cuối

Khi chủ sở hữu đã cấp quyền Maps/OpenAI/quota, tiến hành trong môi trường **Traffic riêng**:

- `GET /health`: cờ Maps, AI, mã bảo vệ, rate limiter = true.
- `POST /api/ask` từ iPhone với GPS hợp lệ và câu "Từ Cầu Giấy đi Hà Đông": xác minh Places, Routes, câu trả lời dựa trên duration và polyline thật.
- Cùng hành trình hỏi "Nguyễn Trãi có chậm không?", "Nếu đi Tố Hữu?", "Kiểm tra lại đi"; xác minh mỗi câu cần thiết đều gọi lại API.
- Đổi điểm đến 2 lần; hỏi theo GPS mới; không dùng vị trí cũ.
- iPhone: 10 lượt hỏi liên tiếp, ít nhất 3 câu hỏi tiếp, 2 lần làm mới, 1 ngắt loa, 1 thử tiếng ồn an toàn, lỗi mạng/GPS.
- Tách latency: STT, tool-selection, Places, Routes, TTS, tiếng đầu; ghi model, key/quota provider, timestamp và response errors nhưng **không lưu API key hoặc nội dung cá nhân**.
- Xem billing thực tế Google, OpenAI và Cloudflare, không suy đoán mức miễn phí theo benchmark giả.

## Kiểm soát rủi ro

- Chưa có permission Google Maps => Worker **fail-closed HTTP 503**, không gọi API tính phí.
- Không bật endpoint công khai nếu thiếu `TRAFFIC_ACCESS_TOKEN` mạnh, quota Cloud Google, và chính sách giám sát mức tiêu thụ.
- Voice browser STT/SpeechSynthesis có thể phụ thuộc iOS; trên iPhone cần chốt phương án TTS sau khi nghe thật.
- Để hoàn tác: rollback commit branch Traffic hoặc rollback Worker `nmh-traffic-voice-v1` riêng. **Không sửa Ngố**.

## Thông tin kiểm chứng

- Mã nguồn Traffic GitHub: `https://github.com/hvnm1206/TikTak-Service/tree/nmh-traffic-voice-v1-20261114/traffic-voice`.
- CI Traffic: `https://github.com/hvnm1206/TikTak-Service/actions/workflows/traffic-voice-verify.yml` (có thể phải chọn nhánh Traffic).
- Hướng dẫn cài đặt và giá: `README.md` cùng thư mục.


## TRAFFIC GOOGLE CLOUD READONLY AUDIT 20261114 — vòng kiểm tra quyền bổ sung

Yêu cầu từ chủ sản phẩm: **Operator chịu trách nhiệm làm đến sản phẩm cuối**, người dùng chỉ hỗ trợ với thao tác không thể thay thế như quyền Cloud Console, billing hoặc chấp thuận OAuth.

Thực tế đã làm trong vòng kiểm tra này:

- NMH Guarded Operator tạo Apps Script **test cô lập** `nmh-traffic-gcloud-readonly-audit-20261114` — script ID `1yypaUDSOToHnS1tyB276_WNxEgEHzmLv2ACEgWqUbgP9QusenSxKKiB9`. Không sửa Ngố/Mendo/CMT.
- Mã kiểm toán truy vấn GET metadata của bốn project từng được nhắc đến: `nmh-gpt-control`, `bancan-toico`, `mendo-zaloOA-test`, `suachua-diennuoc-hanoi`. Chỉ mã trả về HTTP code và cờ billing/APIs/key count, **không gọi `getKeyString` hoặc xuất bí mật**.
- Đã tạo Apps Script phiên bản 2 với Execution API riêng `access=MYSELF`. Guard chứng nhận `inspectTrafficCloudAccess` tại phiên bản 2: SHA-256 `20920feae107fad72c206c1c102a8a6cae77693fb7e078abfa1dbb715b4be174`.
- Khi thực thi, Operator trả lỗi thực tế: `CLOUD_PROJECT_BINDING_REQUIRED`; Apps Script mới chưa gắn đúng standard Google Cloud project của OAuth client. Google project được Operator xác minh: `nmh-gpt-control`, number `762713178215`. Public Apps Script REST API không tự thay binding được. **Vì chưa chạy được, chưa được khẳng định Maps/billing/key đã có hoặc còn dùng được**.
- Thử đọc workflow cũ `tiktak+googlemap-Hanoi` (inactive) qua Guarded Operator: workflowId không được chấp nhận thay `workflow_key`. Guard **BLOCK** yêu cầu thêm alias workflow vì đây là metadata mutation ngoài quyền kiểm toán. Không sửa workflow cũ hoặc registry.
- Tìm trong GitHub Actions repo cho `GOOGLE_MAPS_API_KEY`, `OPENAI_API_KEY`, `TRAFFIC_ACCESS_TOKEN`: chưa có theo audit có chứng cứ `43614280513`. Backend Traffic vẫn fail-closed.
- Đã mở luồng chính thức OpenAI Platform API key setup, cần thao tác chọn/cấp quyền tài khoản của chủ sở hữu. Không nhận hoặc hiển thị khóa trong chat.
- Không có công cụ Google Cloud Console/browser trực tiếp ở phiên chat này; không thể tự xác nhận/enable Routes, Places, billing, tạo Google API key trong Cloud Console bằng việc đoán quyền.

**Điều kiện chặn thực tế:** quyền truy cập Google Cloud Console hoặc cơ chế API Keys API được cấp quyền hợp lệ; sau đó kiểm tra billing, bật API với phê duyệt chi phí, tạo key mới có API restriction Routes/Places, lưu bí mật vào Traffic Worker và chạy test live. **Không coi việc tạo audit script là hoàn thành sản phẩm.**

**Giữ nguyên điều kiện nghiệm thu:** Google Routes/Places live → AI chọn tool đúng → STT/TTS Safari iPhone thành công, gồm 10 lượt thoại và các tình huống lỗi. Không khẳng định PASS iPhone nếu chưa có kết quả thực.


## KẾT QUẢ BINDING 23:51 (14/11/2026) — đã chạy kiểm toán thật, chưa đủ Maps API

1. Chủ tài khoản đã gắn Apps Script `nmh-traffic-gcloud-readonly-audit-20261114` vào standard Cloud Project `nmh-gpt-control`, project number `762713178215`. `nmh_google_environment_preflight` báo `READY`, phiên bản Apps Script 2 thực thi thành công qua `nmh_script_run_readonly_function` đã được Guard chứng nhận.
2. Bản read-only V2: `nmh-gpt-control` ACTIVE, Routes/Places đều DISABLED (200, state != ENABLED). API Keys và Cloud Billing trả 403. Kiểm tra thêm nội dung lỗi cho thấy 403 do **API Keys API và Cloud Billing API chưa được bật trên caller project 762713178215**, chưa đủ cơ sở quy kết thiếu vai trò IAM đối với các target project.
3. Mở rộng kiểm toán GET-only V3: Cloud Resource Manager `projects:search` trả 15 dự án mà OAuth nhìn thấy. Script được chứng nhận V3 SHA256 `45df998632fa50587805a9800e075f00d3a070b6f1720012e7194d2c1579b9e0`, cập nhật deployment riêng `AKfycbyE15jxDk3lnxKgfKqwSVE4sC018Hitm6M_BxWi7IKDc8ZQr5nVgLnVAi_OF5SnVCa1Rg`; function run PASS.
4. Trong 15 dự án Cloud Search thấy được, **không có dự án nào kiểm toán xác nhận đã ENABLED cả Routes API và Places API (New)**. Dự án `nmh-maps` ACTIVE nhưng Routes/Places đều DISABLED. Một số project có 403/400 nên không thể khẳng định trạng thái ngoài phạm vi có quyền.
5. Chưa bật Routes/Places, chưa liên kết Billing, chưa tạo/tải API key và chưa ghi secret vào Worker. Đây là các hành động quản lý tài nguyên/có khả năng phát sinh phí; cần phê duyệt phạm vi và ngân sách từ chủ tài khoản trước khi mutation. API Keys API có tài liệu Google xác nhận miễn phí; điều đó **không** đồng nghĩa Routes/Places miễn phí.
6. Đã xác minh URL Traffic `https://nmh-traffic-voice-v1.magical-budget.workers.dev/health` đang trả HTTP 200 với `mapsConfigured=false`, `aiConfigured=false`, `accessConfigured=false`; Ngố `/health` vẫn HTTP 200. Không có UAT iPhone và chưa nghiệm thu cuối.

**Bước tiếp theo có điều kiện:** chủ tài khoản xác nhận dự án `nmh-maps`, chấp thuận liên kết billing/bật Routes/Places và giới hạn chi phí kiểm thử; Operator thực hiện bằng phương thức có quyền và giữ khóa bí mật trong Worker riêng, hoặc chỉ yêu cầu thao tác chủ sở hữu thực sự không thể thay thế. Phải kiểm thử API thật, kiểm tra cờ /health, 10 lượt voice iPhone, không tuyên bố thành công khi còn thiếu.
