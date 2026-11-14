# NGỐ — Sửa lẫn ý định ghi nhớ / nhắc việc — 14/11/2026

## Bằng chứng từ người dùng
- Người dùng nói “Ghi nhớ: Mẹ của Minh mèo tên là Thanh Vịt”.
- Ngố trả “Chưa đặt, khoảng thời gian chưa hợp lệ”, nhầm yêu cầu lưu thông tin lâu dài với hẹn giờ.
- Không phải do người dùng thiếu giờ; yêu cầu này không có khái niệm giờ.

## Truy nguyên source
- Thứ tự backend: handleVoiceNote → handleVoiceMemory (nhận dạng cú pháp hẹp) → GPT với ActionRegistry.
- Khi câu nói tự nhiên không khớp mẫu Memory cũ, GPT chỉ có set/list/cancel_reminder; thiếu tool save_memory. Nếu GPT gọi nhầm set_reminder với delay 0, backend trả lỗi thời gian cố định, làm mất lượt ghi nhớ đúng.
- Vấn đề gốc là **tool coverage/semantic routing**, không phải danh sách câu cần bổ sung vào regex. Không vá bằng keyword hardcode hay sửa câu thoại.

## Sửa theo nghĩa
1. Thêm tool `save_memory` vào cùng GPT ActionRegistry để GPT chủ động phân biệt GHI NHỚ THÔNG TIN và HẸN GIỜ / NHẮC VIỆC.
2. Backend chỉ ghi Memory cho chủ thể đăng nhập Google hiện tại, quote bắt buộc khớp câu người dùng hiện tại; D1 insert + readback mới ACK; không có quyền thì không ghi.
3. Khi GPT chọn nhầm set_reminder nhưng thời gian sai, cho mô hình 1 lượt tự đánh giá lại ý định và gọi đúng save_memory; không lặp câu “Chưa đặt, khoảng thời gian chưa hợp lệ”.
4. Giữ nguyên đường ghi nhớ và ghi chú đã chạy trước, không sửa memory schema, mic, TTS, theme, Ngáo.
5. Test: câu thật người dùng, bản diễn đạt tự nhiên dài hơn, không cookie, không lưu nhầm nhắc, GPT chọn sai rồi sửa, 71 legacy + P0; sandbox Cloudflare D1 và rollback; phát hành có version D1 bookmark.

## Kết quả
- CI source và 71 legacy/P0 tests đã chạy thành công sau chỉnh sửa và bản kiểm thử nhận dữ liệu tiếng Việt đúng.
- Sandbox và production gate phải PASS trước khi tuyên bố release. Nghiệm thu nói thực trên iPhone phải dựa trên thử nghiệm sau bản phát hành.

## Nâng cấp suy luận quan hệ nhiều bước — scope bổ sung
- Người dùng đã cung cấp: Minh mèo là con người dùng, Thanh Vịt là mẹ Minh mèo. Ngố cần rút ra quan hệ cùng nuôi dạy/con chung, nhưng chỉ kết luận vợ chồng nếu có thông tin hôn nhân được xác minh.
- Truy nguyên code: loadV3Context trước đây lấy 6 dòng Memory có khớp từ khóa, có thể bỏ sót dữ kiện thứ hai nối qua cùng một người. Đã sửa phương pháp truy xuất multi-hop bằng token chung (không hardcode tên Thanh/Minh hay quan hệ), giữ đúng Google subject.
- Agent có chỉ dẫn nối các dữ kiện có chung thực thể, phân biệt suy luận chắc chắn và tình trạng hôn nhân chưa xác minh.
- Test: 5 memory facts, yêu cầu quan hệ Thanh Vịt và người dùng, kiểm tra cả facts Minh là con và Thanh là mẹ được trả về đồng thời; kiểm tra user khác không leak.
- CI 71 legacy và 27 mới PASS: https://github.com/hvnm1206/TikTak-Service/actions/runs/43582072410 . Chưa release tại thời điểm bổ sung này.
