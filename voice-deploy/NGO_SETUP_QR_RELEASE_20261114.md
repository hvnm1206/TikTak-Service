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
