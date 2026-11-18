-- Định dạng ngày riêng của nguồn (vd Tuổi Trẻ) + ghi nhớ danh mục người dùng đã thấy lúc lưu lựa chọn,
-- để nguồn/nhóm mới thêm sau tự bật cho người dùng cũ.
ALTER TABLE sources ADD COLUMN date_format TEXT;
ALTER TABLE user_prefs ADD COLUMN sources_known TEXT;
ALTER TABLE user_prefs ADD COLUMN categories_known TEXT;
-- Người dùng đã lưu lựa chọn trước 18/11/2026: ghi nhận danh mục lúc đó, để nhóm/nguồn mới thêm hôm nay tự bật.
UPDATE user_prefs SET
  categories_known = '["Mô hình & nghiên cứu AI","Sản phẩm & ứng dụng","Doanh nghiệp & đầu tư","Chính sách & pháp lý","Chip & phần cứng","Công nghệ Việt Nam","Khác"]',
  sources_known = (SELECT json_group_array(id) FROM sources)
WHERE categories_known IS NULL;
