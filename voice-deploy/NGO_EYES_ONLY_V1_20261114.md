# NGỐ — EYES-ONLY UI V1, kế hoạch và nghiệm thu (14/11/2026)

## Mục tiêu
Giữ Ngố là trợ lý thoại với nhân vật biểu đạt bằng đôi mắt sống động. Không dùng mặt Vịt/Corgi nguyên khối quay/nhún như mặt nạ. Mọi tính năng Voice, Marin, GPT, Web Search, Reminder, Memory, Setup, OAuth, D1 giữ nguyên. Không sửa Ngáo.

## Kiến trúc đã chốt
- Theme selector `nmh_voice_theme_v1` trong SETUP, tương thích giá trị cũ `default`, `duck`, `corgi`. Thêm `eyes` (Mắt Ngố).
- `default`: giữ nguyên canvas NMH Presence cũ; không thay đổi event của mic hoặc audio.
- `eyes`, `duck`, `corgi`: không có hình đầu, mỏ, miệng, tai, mặt; chỉ đôi mắt với đồng tử, mí, ánh sáng và đường mày tối giản. Ba phong cách chỉ khác bảng màu và tỷ lệ mắt, dùng cùng một engine.
- Animation: chớp mí ngẫu nhiên theo nhịp tự nhiên, dịch chuyển đồng tử nhỏ khi idle, hướng nhìn tập trung khi nghe, nhìn suy nghĩ khi xử lý, dao động nhẹ khi nói, mắt trầm xuống khi lỗi. Pointer/touch có thể điều khiển hướng nhìn; chạm làm chớp mắt.
- Không xoay cả mặt, không lắc đầu, không bob toàn nhân vật. `prefers-reduced-motion` tắt tự động chuyển động.
- `theme-ui.js` chỉ bổ sung CSS/DOM vào HTML; theo dõi `#stateHint` và `#status` của Presence UI, không gọi endpoint hoặc thay hàm mic/TTS. Canvas cũ chỉ ẩn theo CSS ở theme mắt mới.
- Không hardcode câu thoại người dùng, cá nhân hay quan hệ. Các trạng thái UI dùng nhãn hiển thị đã có.

## Kế hoạch / kết quả
1. Audit mã `presence-ui.js`, `theme-ui.js`: DONE. Xác nhận Presence có mắt động, audio analyser và status hook; layer theme cũ làm nguyên mặt quay.
2. Triển khai bộ mắt động độc lập, giữ theme selector và legacy default: DONE, GitHub commit `d78ea7a`; sửa SVG transform để vị trí hai mắt không bị ảnh hưởng scale mí ở commit `4331c69`.
3. Unit/behavior + hồi quy: **101/101 PASS** (72 core + 29 reminder/theme); trong đó có VM DOM behavior test chọn theme, trạng thái nghe/nói, chuyển pupil, reset default; https://github.com/hvnm1206/TikTak-Service/actions/runs/43588435662 .
4. Sandbox Cloudflare D1/Worker và rollback: PASS, https://github.com/hvnm1206/TikTak-Service/actions/runs/43587884426 .
5. Production release version-gated, Worker cũ, URL giữ nguyên, D1 backup artifact: PASS https://github.com/hvnm1206/TikTak-Service/actions/runs/43588003169 . New Worker version `f24ae459-324a-4aef-96d0-7713454d62e4`; rollback immediate `fa391d70-0eaa-4e7d-8643-1943e119619e`.
6. Guard/Operator independent GET https://nmh-voice-gpt-test.magical-budget.workers.dev/ : HTTP 200, actual served HTML includes Mắt Ngố/Mắt Vịt/Mắt Corgi, `ngo-eye`, `ngo-iris`, `scheduleBlink` and preexisting SpeechRecognition code.
7. **Chưa có nghiệm thu trực tiếp iPhone**: dùng SETUP chuyển 4 theme, kiểm tra mắt chớp/đổi hướng khi chạm, nghe/nghĩ/nói, âm lượng Marin, mic, Reminder, Memory; nếu Safari có lỗi cần screenshot/video/log thực.

## Bằng chứng & giới hạn
- Bài kiểm thử VM mô phỏng DOM và Worker HTML/HTTP, **không phải screenshot Safari**. Không nói iPhone đã PASS.
- Release tồn tại, có rollback Worker version; bản này không migration hay sửa D1.
- Những tên theme Vịt/Corgi là phong cách mắt trừu tượng độc lập, không sao chép nhân vật bản quyền.
