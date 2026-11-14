# Ngố — Natural Reminder Time / 14-11-2026

## Kết quả sau thực thi
- CI 71 legacy + 23 new PASS; thử tự động nói “7 giờ tối nay” → 19:00 Asia/Ho_Chi_Minh, không cần nói ISO.
- Sandbox Cloudflare Worker và D1 riêng, claim/readback owner, rollback đúng bản và cleanup: https://github.com/hvnm1206/TikTak-Service/actions/runs/43581134027 SUCCESS.
- Worker production chính cập nhật có kiểm soát: https://github.com/hvnm1206/TikTak-Service/actions/runs/43581221209 SUCCESS; version mới `b4b18bd1-3562-4bab-9d59-2cee3c3a399c`, rollback `253c198a-5af6-4a98-9776-ebe9b06aa424`, D1 bookmark artifact 30 ngày.
- Không đổi URL, không đụng Ngáo, không sửa microphone/Marin/Theme/Memory. Chưa có bằng chứng người dùng iPhone thử lại sau phiên bản mới.

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
