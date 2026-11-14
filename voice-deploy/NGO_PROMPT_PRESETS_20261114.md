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

## Kết quả và giới hạn đã kiểm chứng
- CI source, 74 core + 40 theme/reminder/UI = **114/114 PASS**; sandbox #43613858183 SUCCESS, có marker `NGO_SANDBOX_NAMED_PROMPTS_D1_PERSIST_ACROSS_SWITCHES=PASS` và `NGO_SANDBOX_WORKER_ROLLBACK_EXACT_VERSION=PASS`.
- Production Guard release #43613990687 **SUCCESS**, D1 schema `presets_json`, `active_preset` được bổ sung (không xóa dữ liệu), Time Travel backup artifact được tạo. Worker version mới **`fcd54e1a-6611-4b13-8748-d73e71f5fdc1`**; rollback code **`c35801d0-a840-4d4c-adc1-155c6070489a`**.
- Guard/Operator GET app chính HTTP 200, HTML có `savedPresets`, `selectPreset`, `activePreset`, `presetKey:selectedKey`; micro/QR còn hiện diện.
- **Giới hạn dữ liệu cũ:** Prompt đã lưu trước migration vẫn còn, nhưng vì hệ thống cũ không lưu tên mẫu, không thể tự gắn nó với Đanh Đá nếu không có căn cứ. Người dùng cần gán/lưu một lần cho đúng mẫu nếu muốn cập nhật nút này. Không tự khẳng định đã thử bằng phiên Google/iPhone cá nhân.

## UI regression correction after live screenshot
- Root cause: selecting a preset invoked `markPromptDirty()` and triggered a false `confirm` on subsequent template clicks. Also a background profile refresh could overwrite a selected template if dirty flag was cleared. Corrected with separate `presetSelectionPending` from actual `promptDirty`.
- Added VM-based real SETUP JS interaction tests: all 3 presets choose/edit/save/switch/reload, no phantom confirm, unsaved draft confirm only for genuine input, late refresh safe. CI #43615124322 **117/117 PASS**.
- Must pass new Cloudflare isolated D1 sandbox then Guard release; previous production behavior should not be described as fixed until deployed.
