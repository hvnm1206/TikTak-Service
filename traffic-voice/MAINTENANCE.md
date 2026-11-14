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
3. Chưa tạo/triển khai Worker Traffic trên Cloudflare; không có URL app Traffic đã xác minh.
4. Chưa gửi request **thật** đến Places/Routes/OpenAI; số liệu trong unit test chỉ là mock.
5. Chưa đo độ trễ và chất lượng nhận giọng/loa trên iPhone Safari; chưa thử tiếng ồn xe trong điều kiện an toàn.
6. Chưa có log/chi phí phát sinh của Traffic.

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
