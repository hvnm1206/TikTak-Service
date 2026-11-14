# NGỐ — Mã QR mở ứng dụng trong SETUP (14/11/2026)

## Mục tiêu
Hiển thị mã QR quét bằng camera trên điện thoại trong tab SETUP; URL chính xác: https://nmh-voice-gpt-test.magical-budget.workers.dev/ . Không thêm đăng nhập, token, API key hoặc thông tin người dùng vào QR.

## Cách làm
- QR Version 4, error correction M, matrix 41x41 với viền trắng 4 module, SVG trắng/đen sắc nét và responsive.
- QR được nhúng trong `voice-deploy/qr-ui.js` bằng ma trận đã xác minh; hoạt động offline, không phụ thuộc CDN, Google Chart hay bên thứ ba.
- SETUP hiển thị trực tiếp mã QR, liên kết bấm mở app và nút SAO CHÉP LINK. Đường dẫn public duy nhất; không đổi URL, micro, Marin, GPT, D1, Memory, Reminders, tema mắt.
- Mã QR được tạo từ URL đúng và giải mã độc lập bằng OpenCV trước khi đưa vào app; kiểm tra SHA256 của matrix `9aa11ca4324cf0479d963dd15c73793348d28088ebe499bb901883b9743ff026` để ngăn thay đổi không kiểm chứng.
- Kiểm thử Node trên HTML Worker: QR chỉ 1 lần, đúng URL, có matrix/viền trắng, link, copy, không external QR, voice còn hiện diện.

## Cổng kiểm thử / phát hành
1. CI toàn bộ unit, regression, build-check — cần PASS.
2. Sandbox Worker + D1 thật, HTTP và kiểm tra rollback chính xác — cần PASS.
3. Production deploy giữ URL đúng, so phiên bản Cloudflare với baseline và lưu D1 Time Travel bookmark — cần PASS.
4. Guard read-only GET production, kiểm marker QR, voice, API capabilities — cần PASS.
5. Camera iPhone thực quét và mở app — chưa thể xác nhận chỉ bằng CI.

## Bàn giao
Cập nhật BẢO TRÌ và START_HERE_NEXT_CHAT sau khi có run IDs, version production và rollback thực, không dùng tên phiên bản giả định.

## Bằng chứng phát hành cuối (14/11/2026)
- Đã scan độc lập ma trận QR bằng OpenCV từ hình ảnh gốc: nội dung chính xác `https://nmh-voice-gpt-test.magical-budget.workers.dev/` (không kèm dữ liệu cá nhân).
- CI kiểm tra mã hiện tại: **114/114 PASS** (74 core + 40 voice/reminder/theme/QR) — https://github.com/hvnm1206/TikTak-Service/actions/runs/43610054668
- Cloudflare sandbox thực với D1, rollback đúng version và dọn tài nguyên: **PASS** — https://github.com/hvnm1206/TikTak-Service/actions/runs/43610054623
- Production release có Guard, mốc D1 Time Travel, rollback tự động: **PASS** — https://github.com/hvnm1206/TikTak-Service/actions/runs/43610159478
- Cloudflare Worker `nmh-voice-gpt-test` new production version: **`c1755bd1-5e2a-4af8-b542-d4557446cef4`**, rollback code version **`4f2c3cd2-e814-41f1-87da-85dc6e371079`**.
- Guarded Operator GET chính xác production root URL: **HTTP 200**, có `ngoQrShare`, `ngoAppQrCode`, `ngoAppQrLink`, `ngoAppQrCopy`, URL chính xác, giọng nói `SpeechRecognition` và `audioCtx` vẫn hiện diện; không tải QR từ bên thứ ba.
- **Chưa nghiệm thu quét mã trực tiếp bằng camera iPhone của người dùng**. SVG/ma trận đã được giải mã độc lập; trải nghiệm Safari và camera cần kiểm chứng trên thiết bị.
- Không sửa mã âm thanh, D1, API key, nghiệp vụ hay nhắc việc trong lần phát hành này.
