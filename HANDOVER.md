# NMH VOICE GPT V1 — BÀN GIAO CHUẨN
Ngày cập nhật: 13/11/2026
Trạng thái: Người dùng đã xác nhận app Cloudflare chạy OK trên iPhone. Các chức năng chưa được kiểm thử kỹ không được tự tuyên bố PASS.

## 1. Nhiệm vụ và yêu cầu khóa
Ứng dụng biến OpenAI Text API thành hội thoại giọng nói tiếng Việt trên iPhone.
- Mở HTTPS bằng Safari, không cần đăng nhập.
- Nhấn NÓI → Safari SpeechRecognition (vi-VN) → văn bản → Cloudflare Worker → OpenAI chat/completions → nội dung phản hồi → SpeechSynthesis (vi-VN) phát giọng → tự nghe lượt tiếp theo.
- Người dùng nhập API key trong SETUP; có kiểm tra, thay, xóa, lưu tại localStorage iPhone theo lựa chọn.
- Điều chỉnh pitch 0.8–2.0, rate 0.7–1.4, nghe thử, khôi phục mặc định. Thay pitch chỉ mô phỏng giọng trẻ em, không phải model giọng trẻ thật.
- Không sử dụng OpenAI Realtime, Speech-to-text hay TTS trả phí; chi phí AI theo token text; Voice Web Speech API không có phí API riêng của ứng dụng.
- Không tự thêm auth, database, dịch vụ trả phí. Không sửa app khác nếu không có nhiệm vụ.

## 2. Nguồn kiểm soát
Repository: https://github.com/hvnm1206/TikTak-Service
Nhánh riêng: nmh-voice-gpt-v1 (KHÔNG sửa main hay TikTak).
Frontend + backend: voice-deploy/worker.js
Cloudflare: voice-deploy/wrangler.jsonc
CI/CD: .github/workflows/nmh-voice-preview.yml
Tài liệu bàn giao: HANDOVER.md
Nhật ký bảo trì: MAINTENANCE.md

Tài liệu:
https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-gpt-v1/HANDOVER.md
https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-gpt-v1/MAINTENANCE.md

Commit đã xác minh trước bản BẢO TRÌ: 81038e70eb41084653ee53f576043e7848c38b43
Workflow thành công: https://github.com/hvnm1206/TikTak-Service/actions/runs/43395672858
Model trong mã nguồn: gpt-4o-mini, API /v1/chat/completions.
Backend: GET /, GET /health, POST /api/test, POST /api/chat; bản BẢO TRÌ bổ sung endpoint đọc tài liệu ở /api/docs/*.

## 3. URL và deployment
Bản Cloudflare đầu tiên: https://nmh-voice-gpt-test.obsidian-authority.workers.dev — người dùng đã gửi ảnh “Your site is live” sau khi nhận quyền sở hữu.
Bản có chức năng lưu key/chỉnh giọng: https://nmh-voice-gpt-test.rural-jay-4ff.workers.dev — phát hành từ commit 81038e70; người dùng nói “Bây giờ app đã chạy OK”.
Hai Worker thuộc hai đợt phát hành temporary khác nhau. Cần kiểm tra quyền sở hữu và URL thực tế trước khi sửa/deploy. Trạng thái sở hữu Worker mới nhất CHƯA được kiểm chứng đầy đủ.
KHÔNG nhầm việc GitHub Actions SUCCESS với việc app đã được cập nhật trên Worker cố định. Cloudflare có thể hiển thị challenge HTTP 403 cho công cụ kiểm thử dù Safari dùng được.

## 4. Kiến trúc và lưu trữ
- HTML/CSS/JS chạy trực tiếp trong trang Cloudflare Worker, không iframe.
- Trình duyệt nhận giọng SpeechRecognition/webkitSpeechRecognition; đọc giọng SpeechSynthesisUtterance, chỉnh utterance.pitch và utterance.rate.
- Cloudflare Worker chuyển tiếp OpenAI Text API với key người dùng cung cấp qua HTTPS.
- localStorage: nmh_voice_api_key_v1; nmh_voice_pitch_v1; nmh_voice_rate_v1. Key nằm ở localStorage, JavaScript của cùng origin có thể đọc được; không phải kho bí mật tuyệt đối. Key được truyền đến Worker/OpenAI khi gọi API, không ghi cứng vào source.
- Không database. Lịch sử hội thoại ở RAM (tối đa 12 tin gần nhất được gửi làm ngữ cảnh).
- Khi hỏi model, không để AI tự nhận sai; lấy giá trị gpt-4o-mini từ cấu hình thật.

## 5. Lịch sử lỗi cần tránh
1. Lovable: thêm đăng nhập ngoài yêu cầu, hết credits; không tiếp tục nền tảng này.
2. Apps Script Web App: frontend trong iframe bị iPhone từ chối micro (SpeechRecognition: not-allowed); bỏ Apps Script làm frontend Voice.
3. Kết luận thiếu khả năng triển khai Cloudflare khi chưa kiểm tra GitHub Actions + Wrangler; đây là kết luận sai.
4. Chạy “wrangler deploy --temporary” nhiều lần sinh tài khoản/URL mới; phải chuẩn hóa deploy vào tài khoản Cloudflare cố định.
5. API key chỉ giữ RAM khiến phải dán lại; đã chuyển sang lựa chọn localStorage.
6. AI từng tự nói GPT-3.5 trái cấu hình thực tế; thông tin model phải lấy từ source.
7. HTTP 200, source PASS, deployment PASS khác với voice iPhone PASS. Chỉ xác nhận các phần có bằng chứng.

## 6. Quy tắc làm tiếp
TASK → kiểm tra quyền/công cụ → đọc nguồn thật → phân tích nguyên nhân → xác định phiên bản/backup → sửa → kiểm tra cú pháp → commit → deploy đúng Worker → kiểm chứng thực tế → bàn giao.
Ưu tiên sử dụng NMH Guarded Operator cho những nghiệp vụ trong phạm vi công cụ; công cụ GitHub/Cloudflare tuân thủ quyền và kiểm soát riêng.
Không hỏi lại thông tin đã có trong tài liệu, không dựng lại app, không sao chép key vào log, không sửa main, không quay lại iframe hoặc dịch vụ Voice có phí.
Cửa chat mới cần đọc HANDOVER.md và MAINTENANCE.md ở nhánh này, sau đó đọc source và kiểm tra commit/deployment mới nhất. Các tài liệu không thay thế kiểm tra hiện trạng thực.

## 7. Việc cần hoàn thiện
- Chính thức hóa CI/CD vào Worker thuộc Cloudflare đã nhận quyền sở hữu; ngừng tạo temporary URL mỗi lần cập nhật, có rollback.
- Kiểm tra lại phiên bản và quyền sở hữu Worker đang được người dùng sử dụng.
- Kiểm tra lưu/khôi phục/xóa key, pitch/rate trên Safari thật.
- Kiểm thử nhiều lượt hội thoại, chuyển nền, mất mạng, lỗi quyền micro.
- Audit bảo mật CSP, XSS, localStorage, server logs, limit request và token cost.
- Tab BẢO TRÌ chỉ phục vụ tham chiếu và copy; GitHub là nguồn chuẩn cho tài liệu. Không ghi secret vào tài liệu công khai.

## 8. Tiêu chí nghiệm thu cho thay đổi
Phải có file nguồn, commit SHA, workflow/deployment, URL đang chạy, ảnh/test thao tác thực (khi liên quan iPhone), kiểm tra hồi quy Voice và ghi rõ phần chưa đạt.
KHÔNG tuyên bố hoàn thành chỉ dựa vào kế hoạch, ZIP, nguồn code, hay deploy thành công.
