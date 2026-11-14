# NGỐ — Khắc phục LƯU PROMPT trong SETUP (14/11/2026)

## Triệu chứng người dùng
Ảnh iPhone cho thấy trường TÍNH CÁCH — PROMPT có nội dung tùy chỉnh và nút LƯU PROMPT; người dùng báo không lưu được khi tạo mới hoặc sửa. Chưa có phiên Google/API log của lần lỗi cá nhân nên không xác nhận nguyên nhân duy nhất từ ảnh.

## Audit luồng cũ
- Giao diện PUT /api/v3/profile với revision lấy khi populate, nhưng nút báo “Đã lưu” chỉ theo HTTP 200, không đọc lại D1.
- Thông báo nằm ở v3Msg dưới toàn bộ khu cá nhân hóa nên khi đang ở nút dễ không thấy thành công hay lỗi.
- populate sau refresh có thể ghi đè ô Prompt đang sửa bằng dữ liệu cũ.
- Revision optimistic locking hiện có đúng chủ đích, nhưng 409 không hiện sát nút và không bảo vệ trải nghiệm sửa nhiều thiết bị.

## Sửa đổi có kiểm soát
- Giao diện v3-ui.js: status inline cạnh nút; có trạng thái ĐANG LƯU / ĐÃ LƯU VÀ ĐỌC LẠI / CHƯA LƯU; ngăn bấm lặp, giữ bản nháp nếu refresh hoặc PUT lỗi; các nút mẫu đánh dấu chưa lưu.
- Trước ghi: GET revision hiện tại; nếu thay đổi từ thiết bị khác khác baseline, giữ draft và yêu cầu bấm lưu lại sau khi nhận thông báo xung đột, không âm thầm ghi đè.
- Sau PUT: yêu cầu receipt D1 exact prompt+revision; GET độc lập lần nữa để xác nhận nội dung lưu trong tài khoản; không xác nhận nếu thiếu bằng chứng.
- Backend v3-backend.js: INSERT/UPDATE theo chủ sở hữu, kiểm revision và đọc lại D1; báo lỗi 503 nếu ghi/đọc lại không xác minh; 409 nếu xung đột. Không thay đổi câu Prompt người dùng.
- Không chạm microphone, audio/Marin, GPT, Memory, dữ liệu cá nhân của người dùng hoặc Ngáo.

## Bằng chứng phải đủ trước production
1. CI full legacy+new test: create, edit, exact readback, stale revision conflict, status UI.
2. Cloudflare Worker + D1 sandbox thực với tài khoản giả lập; test PUT create, GET, PUT edit, GET, 409 và dữ liệu D1; rollback đúng bản và cleanup.
3. GitHub production release Guard có mốc phiên bản, D1 bookmark, smoke.
4. Read-only Guard production GET xác nhận UI status và code mới. iPhone có Google session thật vẫn cần bấm lưu/hỏi lại để nghiệm thu.

## Nhắc dùng trên iPhone
SETUP → nhập/sửa Prompt → LƯU PROMPT → đọc status ngay bên dưới. “ĐÃ LƯU VÀ ĐỌC LẠI THÀNH CÔNG” chỉ xuất hiện khi D1 được xác nhận. Tự thử thoát/đăng nhập lại và hỏi câu mới để xác minh Prompt được sử dụng.

Tình trạng cụ thể cập nhật thêm sau CI/sandbox/deploy.