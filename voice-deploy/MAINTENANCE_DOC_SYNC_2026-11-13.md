# NMH Voice — BẢO TRÌ document sync release
Ngày: 13/11/2026.

## Mục tiêu
Giữ nguyên NMH Presence production, cập nhật live tab BẢO TRÌ để hiển thị chính xác bản mới nhất của MAINTENANCE.md thay vì bản cũ trên GitHub Raw CDN.

## Bản đã chuẩn bị
- MAINTENANCE.md commit e79913ba4cce262fc63ce64de929e389bbad0815: tổng hợp 8.591 ký tự mới ở đầu tài liệu, giữ nguyên lịch sử 12.302 ký tự; đủ F01–F16 và phản hồi "Tao thấy khá tốt đấy".
- Fetched /api/docs/maintenance cũ HTTP 200 nhưng trả 12.302 ký tự, không chứa phần tổng hợp mới. GitHub Contents API trả đúng tài liệu 20.893 ký tự.
- Worker chỉ đổi nguồn đọc docs từ raw.githubusercontent.com sang api.github.com Contents API; giải mã UTF-8 base64; báo HTTP 502 nếu không lấy được để tránh giả vờ đã tải bản mới.
- Thêm test base64 multiline Unicode, response invalid => HTTP 502; smoke bắt buộc bản bảo trì có '## A. HIỆN TRẠNG ĐANG CHẠY' và F16.
- CI 43439488614: 24/24 tests PASS, deploy SKIPPED; Cloudflare token ACTIVE, version pre-release 7ea82e92-5933-4421-be9d-39c5ca00351e.
- Release dùng GitHub Actions trên cùng Worker, active version snapshot/health guard, automatic rollback on failed smoke.
- Không đổi STT/GPT/TTS/Face/SETUP, không thu/ghi API key, không tạo Worker mới.
## Nghiệm thu
- CI SUCCESS và DEPLOY_FINAL=SUCCESS.
- Worker /health vẫn là presence-canvas-v1, UI markers không mất.
- Worker /api/docs/maintenance trả HTTP 200, bản mới 20.893 ký tự (có phần A, ghi nhận phản hồi người dùng).
- Nếu không đạt: không công bố thành công, dựa vào rollback pre-deploy.
