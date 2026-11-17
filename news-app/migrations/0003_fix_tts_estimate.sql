-- Sửa ước phí cũ: trước 18/11/2026 giọng đọc bị tính 30 USD/1 triệu ký tự từ ký tự đầu tiên,
-- trong khi Chirp 3 HD miễn phí 1 triệu ký tự/tháng. Trừ phần đã tính dư (chỉ dữ liệu tháng 11/2026).
UPDATE usage SET est_usd = MAX(0, est_usd - tts_chars * 0.00003) WHERE day LIKE '2026-11%';
