# Ngố — sửa lỗi mẫu tính cách về câu cố định, 14/11/2026

## Bằng chứng
Ảnh người dùng: nội dung tùy chỉnh Đanh Đá đã nhập, sau đó khi chọn lại MẪU ĐANH ĐÁ xuất hiện câu mặc định "Lanh lợi, đanh đá nhẹ và hài hước..." Mã nguồn cũ có presets hard-coded và onclick gán thẳng `presets.danh`. Backend chỉ lưu `prompt` đang dùng, không lưu mẫu theo tên.

## Quyết định kỹ thuật
- Giữ cả 3 nút nhưng giờ mỗi nút nạp mẫu đã lưu riêng theo Google ID; nếu chưa từng sửa, dùng mẫu mặc định.
- `v3_profiles.presets_json` chứa `danh/chem/nghiem` riêng; `active_preset` lưu mẫu hiện dùng. Hai cột mới thêm additive, không xóa prompt cũ.
- GET profile trả toàn bộ mẫu đã lưu; PUT khi đang chỉnh mẫu được chọn ghi **Prompt đang sử dụng + nội dung mẫu đó** trong cùng D1 transaction UPDATE/INSERT một hàng, tăng revision và xác minh readback.
- Lưu status inline dưới nút. Refresh giữ bản nháp chưa lưu. Chuyển sang mẫu khác khi còn bản nháp phải xác nhận; không tự xóa văn bản người dùng.
- Không sửa micro, Marin, tìm kiếm, nhắc việc, Memory hoặc Ngáo.

## Nghiệm thu
1. Tạo tài khoản giả lập, nhấn Đanh Đá, sửa nội dung riêng, LƯU, GET profile kiểm lại; tải lại vẫn còn.
2. Chuyển Chém Gió sửa/lưu; quay về Đanh Đá không trở về câu hard-coded.
3. 409 conflict bảo vệ ghi đè từ thiết bị khác.
4. Cloudflare sandbox D1 thật, cleanup, rollback PASS.
5. Gated production release đúng Worker version; camera/iPhone thật cần người dùng thao tác cuối.

## Sandbox retry
- The first isolated run found an **obsolete test assertion** that expected the old five-field response without preset metadata; D1 returned the new correct response. Updated test to validate old fields plus new presets and activePreset. Re-run required before release.
