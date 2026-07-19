# HANDOFF – Hải Chi Tiêu / NMH Operator

## Mục tiêu của phiên tiếp theo
Không audit n8n tổng thể. Không chạy lại acceptance test NMH Operator. Không cấu hình lại Drive/Sheets/Gmail.

Tiếp tục duy nhất dự án **Hải Chi Tiêu** tại repo `hvnm1206/TikTak-Service`, thư mục `/chi-tieu`.

Chuỗi công việc bắt buộc:

1. Đọc trạng thái hiện tại trong repo `/chi-tieu`.
2. Dùng NMH Operator để tìm đúng backend/luồng đang phục vụ Google Sheet `Hai_chitieu`.
3. Ưu tiên tận dụng deployment/webhook đang có; không tạo kiến trúc trùng nếu không cần.
4. Nếu dùng Apps Script backend:
   - backup source hiện tại trước khi sửa;
   - cập nhật theo `chi-tieu/backend/Code-v2.gs`;
   - tạo/cập nhật deployment Web App;
   - lấy URL public `/exec`.
5. Nếu backend thật đang đi qua n8n:
   - xác định đúng workflow `Hai_chitieu`/workflow production liên quan;
   - không chỉnh workflow khác;
   - chỉ thay đổi phần cần thiết để app `/chi-tieu` có API ghi/đọc thật.
6. Nối URL backend thật vào frontend `/chi-tieu`.
7. Nghiệm thu end-to-end bằng dữ liệu thật:
   - ghi một khoản test từ web;
   - xác nhận có bản ghi mới trong `RAW_INPUT` hoặc đích production tương đương;
   - Check hôm nay thấy đúng bản ghi vừa ghi;
   - Tổng hôm nay/tuần/tháng đúng;
   - Lịch sử có giao dịch mới;
   - tìm kiếm theo nội dung hoạt động;
   - không bỏ sót bản ghi mới chưa qua `CLEAN_DATA`.
8. Sau test, xóa hoặc đánh dấu rõ bản ghi test nếu phù hợp.

## Trạng thái code hiện tại

Frontend:
- `chi-tieu/index.html`
- Mobile-first, 3 tab: Ghi chi / Check / Lịch sử.
- Đã có logic API + fallback local.
- Có thể nhận backend bằng query `?api=<URL>` và lưu bền trên máy.
- Tìm kiếm frontend đã hỗ trợ bỏ dấu tiếng Việt.

Backend gốc:
- `chi-tieu/backend/Code.gs`

Backend V2 đã chuẩn bị:
- `chi-tieu/backend/Code-v2.gs`
- Có health/ping.
- Có idempotent write theo `clientId/Input_id`.
- Có batch sync dữ liệu local.
- Đọc hợp nhất `CLEAN_DATA + RAW_INPUT` để không bỏ sót giao dịch mới.
- Tìm kiếm không dấu.
- Timezone `Asia/Ho_Chi_Minh`.

Google Sheet chính:
- Tên: `Hai_chitieu`
- Spreadsheet ID: `1xVib9GliMmXHAJgPd9TwjbqMJXUy_pj8cpnEIWnrcsw`
- Ghi thô: `RAW_INPUT`
- Dữ liệu sạch: `CLEAN_DATA`

## Commit liên quan

- `6a7bdb8c936f7c95f52891d0b8b39f0eca8ac107` – Add Hai Chi Tieu mobile web app
- `535cf1bb0713add1317eb80f3f50df842fef2300` – Add Google Apps Script backend
- `6cd0ac9bae4efad094b3b4ba574b23b33d8fd9e0` – Document backend deployment
- `b8f68528d418204a1a3e90620b6708d28ce51a4a` – Connect UI to backend API
- `fe43101f7e7cbb8de5def7bd91fc12d5ae36a682` – Configurable backend + Vietnamese search
- `4e7e1f9006c79489ff24b8cdaab20923677f8d6d` – Backend V2

## Quy tắc thao tác

- Không hard-code vá từng trường hợp.
- Không tạo một backend thứ hai nếu production hiện có đã dùng được.
- Backup trước khi sửa production.
- Không nâng cấp n8n 2.2.3.
- Không thay đổi workflow ngoài phạm vi Hải Chi Tiêu.
- Không dừng ở hướng dẫn; phải thao tác, kiểm tra thực tế và sửa đến khi chạy được trong phạm vi quyền hiện có.

## Tiêu chí hoàn thành cuối cùng

App `/chi-tieu/` mở được bằng URL public ổn định trên điện thoại và dùng dữ liệu thật cho cả:

- Ghi chi
- Check hôm nay / tuần / tháng / khoản lớn nhất / tìm kiếm
- Lịch sử gần đây

Khi tiếp tục từ file này, hãy bắt đầu bằng việc đọc backend/endpoint production hiện tại của `Hai_chitieu`, không bắt đầu từ kiểm tra n8n tổng quát.
