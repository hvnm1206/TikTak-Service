# Hai Chi Tiêu backend

Backend Google Apps Script cho app `/chi-tieu/`.

## Nguồn dữ liệu
- Spreadsheet ID: `1xVib9GliMmXHAJgPd9TwjbqMJXUy_pj8cpnEIWnrcsw`
- Ghi: `RAW_INPUT`
- Đọc/báo cáo: `CLEAN_DATA`
- Check hợp nhất thêm các dòng `RAW_INPUT` chưa xuất hiện trong `CLEAN_DATA` theo `Input_id` để không bỏ sót giao dịch mới.

## Deploy
1. Mở file Google Sheet `Hai_chitieu`.
2. Extensions → Apps Script.
3. Dán toàn bộ `Code.gs`.
4. Deploy → New deployment → Web app.
5. Execute as: Me.
6. Who has access: Anyone.
7. Copy URL dạng `https://script.google.com/macros/s/.../exec`.
8. Điền URL này vào hằng `API_URL` trong `chi-tieu/index.html`.

## API
- `POST {API_URL}` body `{ "action": "add", "rawText": "Taxi 300k" }`
- `GET {API_URL}?action=today`
- `GET {API_URL}?action=week`
- `GET {API_URL}?action=month`
- `GET {API_URL}?action=recent&limit=100`
- `GET {API_URL}?action=search&q=taxi`
