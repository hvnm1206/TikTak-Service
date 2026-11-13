# NMH VOICE GPT V1 — GIAI ĐOẠN B: TRA CỨU INTERNET ĐỘC LẬP
Ngày: 13/11/2026
Nhánh: `nmh-voice-gpt-v1`

## Phạm vi hoàn thành
- Module riêng: `voice-deploy/web-search.mjs`, export `searchWeb(query, {apiKey, fetchImpl, timeoutMs, maxResults})` và `WebSearchError`.
- Dùng Brave Search GET `/res/v1/web/search`; tìm bằng tiếng Việt, khu vực VN, tối đa 5 kết quả HTTPS được lọc/trích ngắn.
- Không dùng key giả làm key thật; không ghi key vào source hay log. Nhận key qua tham số server-side, nguồn chuẩn khi tích hợp là Cloudflare secret `BRAVE_SEARCH_API_KEY`.
- Không tự động cho phép truy cập từ frontend, không mở public endpoint với Brave key dùng chung vì có nguy cơ lạm dụng và tốn phí.
- Không tích hợp vào `worker.js`, không đổi Voice/STT/TTS/SETUP và không deploy production trong Giai đoạn B. Tích hợp và lựa chọn nguồn thuộc Giai đoạn C.

## Kiểm thử đã thực hiện
Lệnh: `node --check voice-deploy/web-search.mjs && node --test voice-deploy/web-search.test.mjs`
Môi trường local: Node 22.
Kết quả: 8/8 nhóm test PASS (mock HTTP), gồm lọc URL, khử trùng, định dạng câu hỏi, giới hạn số kết quả, thiếu secret, lỗi 401/429/503, sai JSON, timeout/network, rỗng và cắt snippet.
Bằng chứng: `voice-deploy/web-search.test.mjs`. Các bài test dùng key giả và dữ liệu giả lập. **Chưa có bằng chứng gọi Brave thật**, chưa xác nhận dữ liệu tìm kiếm thực tế và hạn mức tài khoản.

## Điều kiện tích hợp và nghiệm thu thật
1. Có Brave Search API token hợp lệ (không đặt vào GitHub source; cấu hình bằng Cloudflare encrypted secret). Dịch vụ có $5 credit mỗi tháng nhưng có thể yêu cầu thẻ để đăng ký.
2. Kiểm thử gọi API thật với truy vấn tiếng Việt và đối chiếu URL, nội dung, ngày cập nhật.
3. Thiết kế kiểm soát số lượt tìm/chi phí ở server (rate limit, quota), quyền sử dụng (tránh public unauthenticated endpoint đốt credit).
4. Tích hợp logic khi nào tìm và trích nguồn vào Worker, hoàn thiện kiểm thử tự động.
5. Triển khai vào Worker Magical Budget cố định `nmh-voice-gpt-test` khi đã có quyền triển khai/rollback; kiểm thử Safari iPhone sau phát hành.

## Rủi ro được chốt
- Kết quả Brave chỉ là tiêu đề/trích đoạn, **không đồng nghĩa đã đọc được toàn văn trang web**.
- Dữ liệu search và trang web là đầu vào không tin cậy; không làm theo hướng dẫn nằm trong nguồn tìm kiếm.
- Tính phí theo lượt gọi API, ngoài chi phí token GPT khi dùng nội dung kết quả.
- Không được báo "tra cứu mạng đã dùng được trên iPhone" nếu chưa tích hợp, triển khai và nghiệm thu thực tế.

Nguồn chính thức: https://api-dashboard.search.brave.com/app/documentation/web-search và https://developers.cloudflare.com/workers/configuration/environment-variables/
