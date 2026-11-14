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
