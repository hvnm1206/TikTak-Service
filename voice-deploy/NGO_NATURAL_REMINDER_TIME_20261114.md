# Ngố — Natural Reminder Time / 14-11-2026

## Tình huống thực
Người dùng nói “7 giờ tối nay gọi tao dậy xem bóng đá”, Ngố yêu cầu ngày và giờ đầy đủ. Người dùng phải nói lại nhiều lần dù ý định và mốc thời gian đã rõ.

## Phân tích nguyên nhân từ source
- Schema yêu cầu chuỗi local_at theo ISO có cả giây; backend chỉ nhận YYYY-MM-DDTHH:mm:ss. GPT không phải lúc nào cũng chuyển câu nói tự nhiên thành ISO đúng định dạng. Backend trả cứng “Chưa đặt: cần ngày và giờ cụ thể”.
- Prompt hướng dẫn chung “Với thời gian mơ hồ phải hỏi rõ”, nhưng không xác nhận hôm nay/tối nay là thời gian hợp lệ khi đã có giờ.
- Không được bỏ xác thực user, phạm vi D1, readback, dedup, hay nhắc khi tab đóng.

## Đối sách cụ thể
1. GPT hiểu ý định nhắc/gọi dậy/báo giờ theo giờ hiện tại ở Asia/Ho_Chi_Minh; tự chuyển thành local_at, không ép người dùng nói ngày tháng hay ISO.
2. Backend nhận machine-time dạng ISO có giây, ISO không giây hoặc HH:mm khi nhắc hôm nay; chỉ chuẩn hóa kiểu dữ liệu, không viết bảng hardcode cụm từ hay câu lệnh Việt.
3. Sau normalize: chỉ chấp nhận thời điểm có thật, ở tương lai, không quá 30 ngày; ACK thành công sau khi D1 readback; nếu không đủ thời gian thì mới hỏi lại.
4. Test thực “7 giờ tối nay” = 2026-11-14 19:00 ICT khi giả định bây giờ 15:00; ngày mai 08:30, giờ đã qua, giờ sai, trường trống; 71 bài legacy và P0 test không hồi quy.
5. Sandbox real Cloudflare D1/Worker + rollback, sau đó production release có kiểm tra version, D1 bookmark và rollback; không chạm Ngáo.
