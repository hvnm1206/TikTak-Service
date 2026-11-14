# PROMPT DÁN CỬA MỚI — TIẾP TỤC NGỐ / NMH VOICE GPT
Ngày 14/11/2026. Đây là yêu cầu THỰC THI kỹ thuật, không phải yêu cầu lập kế hoạch rồi dừng.

Bạn là kỹ sư điều phối dự án NGỐ (NMH Voice GPT). Hãy làm theo toàn bộ tài liệu bàn giao chính thức sau trước khi thao tác:
https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-gpt-v1/voice-deploy/NGO_SELECTED_SCOPE_HANDOVER_20261114.md

Đồng thời MỞ ĐỌC TRỰC TIẾP các nguồn:
1. BẢO TRÌ hiện hành mà ứng dụng đọc: https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-gpt-v1/MAINTENANCE.md
2. Bàn giao trong tab BẢO TRÌ: https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-gpt-v1/voice-deploy/START_HERE_NEXT_CHAT.md
3. MÃ NGUỒN NGỐ MỚI NHẤT CHO PHÁT TRIỂN, KHÔNG PHẢI CODE NHÁNH BẢO TRÌ: https://github.com/hvnm1206/TikTak-Service/tree/nmh-voice-memory-v2-stage-20261114/voice-deploy
4. GitHub Actions release gần nhất tính đến ngày bàn giao: https://github.com/hvnm1206/TikTak-Service/actions/runs/43569160880 và kiểm chứng ghi D1 thật https://github.com/hvnm1206/TikTak-Service/actions/runs/43569516448
5. Worker NGỐ đang dùng: https://nmh-voice-gpt-test.magical-budget.workers.dev/health và /api/v3/config; Cloudflare Account 769c2ab4af5ad50700039d473a72d48e; Worker nmh-voice-gpt-test; D1 NMH_DB = nmh-voice-v3, UUID 3ce295cb-a84d-4a50-abee-d14fdd903514.
6. GitHub repo hvnm1206/TikTak-Service. Hai nhánh có vai trò khác nhau: nmh-voice-gpt-v1 là nguồn cho tài liệu tab BẢO TRÌ (source code trên đó đã lạc hậu); nmh-voice-memory-v2-stage-20261114 là nguồn code gần production. Hãy kiểm tra Cloudflare deployment version/commit thật trước khi chọn BASE.
7. Mọi dữ kiện về NGÁO chỉ là THAM KHẢO đọc gói ngao-ban-giao.zip từ cuộc trao đổi trước nếu tệp có sẵn. CẤM sửa, deploy, đụng dữ liệu, token, hạ tầng NGÁO. Nếu không có ZIP vẫn thực hiện theo tài liệu bàn giao Ngố, không đòi người dùng gửi lại nếu không thật sự cần.

MỤC TIÊU NGHIỆM THU CHÍNH: xây lớp action/tool tách biệt có xác nhận kết quả thực thi; thêm đặt/xem/hủy NHẮC VIỆC, ưu tiên "2 phút nữa nhắc tao uống thuốc", phải ghi D1 theo user Google, chỉ báo ĐÃ ĐẶT sau khi đọc lại; đúng hạn phải nhắc khi app foreground, không lặp khi reload/multi-tab; phản hồi CHƯA ĐẶT có lý do khi không làm được. Bắt buộc có trace hành động đã ẩn nội dung nhạy cảm.

PHẠM VI ĐƯỢC CHỌN: P0-1 ActionRegistry, P0-2 reminder V1 FOREGROUND, P0-3 diagnostics + hồi quy. Không triển khai VAD/barge-in/streaming/Web Push/nhắc khi app đóng/kho luật/clip/đổi tên trong đợt này. Không tự làm thay đổi micro, Marin TTS, Web Search, login Google, Memory V2, ghi chú/tài liệu, SETUP, BẢO TRÌ, chi phí và giao diện hiện có. Giữ nguyên URL production.

THỨ TỰ THỰC HIỆN CHẶT:
A. Preflight Guard/Operator + GitHub; đọc source & workflows, lấy deployed Worker version thực, backup/rollback, D1 Time Travel bookmark; xác nhận code nguồn baseline chính xác.
B. Tạo NHÁNH CÁCH LY từ mã gần production. Thêm ActionRegistry có schema/validate/execute/readback/ACK và feature flag OFF. Tập trung set/list/cancel reminder; không chuyển toàn bộ note/memory cũ trong lần đầu.
C. Thêm D1 migration additive 0004_reminders.sql trên sandbox, ownership, idempotency và claim thông báo chống lặp. Không DROP/ALTER bảng cũ, không ghi dữ liệu cá nhân ngoài mục tiêu.
D. Test negative cases trước: no auth, trùng, sai thời gian, timezone +07, expired, cancel, refresh, multi-tab, offline, DB 503, GPT 429, false success, âm thanh iOS không cho autoplay. Giữ và chạy toàn bộ regression cũ. Test Cloudflare sandbox Worker+D1 thật, có evidence.
E. Sau khi sandbox PASS, kiểm soát deployment GIỮ WORKER CŨ và URL, backup bản production, canary đúng tài khoản, smoke /health, mic, Marin, Search, D1, OAuth, Documents, Memory V2 và Maintenance. Test một reminder 2 phút thật trong app đang mở; xử lý khi audio bị chặn bằng hiển thị trạng thái.
F. Nếu không có cách trực tiếp kiểm thử iPhone của chủ sở hữu, không được tuyên bố iPhone PASS. Hoàn thành tối đa các cổng tự động/backend, nêu đúng cổng còn cần người dùng thực nghiệm. Không lấy giả lập thay cho thiết bị thật.
G. Nếu lỗi: chặn phát hành/feature-flag OFF, tự khắc phục phạm vi cho phép, rollback Worker nếu ảnh hưởng mic/Marin/Search. Đối chiếu toàn bộ tính năng đã có, không chỉ tính năng mới.
H. Ghi kết quả vào tài liệu trên GitHub và cập nhật BẢO TRÌ ngắn gọn (<60.000 ký tự); giữ tài liệu nguồn tách riêng. Không tuyên bố hoàn thành khi chưa có bằng chứng.

QUY TẮC: Mọi hành động từ GPT chỉ là Ý ĐỊNH; chỉ code/backend xác nhận thành công sau kiểm chứng. Không bịa nguồn, version, API, thời gian, giá. Không hỏi lại thông tin đã có trong bàn giao. Không dừng ở vài dòng mô tả nếu vẫn có công cụ tiếp tục. Không hứa làm việc nền nếu không có tác vụ thật. Sử dụng GitHub/Operator/Guard đúng quyền. Ngáo là read-only tuyệt đối.

ĐẦU RA: mã thực tế + commit SHA + CI run + kết quả kiểm thử từng lớp + deployed URL/version (nếu thực sự deploy) + bằng chứng D1/rollback + vấn đề tồn + trạng thái Done/Not Done. Nếu công cụ cản một bước, xác định chính xác cản ở đâu, dùng phương án thay thế hợp lệ; không tuyên bố bế tắc mơ hồ.
