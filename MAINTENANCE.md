# NMH VOICE GPT — BẢO TRÌ / NHẬT KÝ KỸ THUẬT
Cập nhật gốc: 13/11/2026.
Nguồn của sự thật: GitHub nhánh nmh-voice-gpt-v1, mã nguồn tại voice-deploy/worker.js.
Không tự tạo trạng thái PASS; thay đổi hạng mục này sau khi có bằng chứng.

## Hiện trạng
- Người dùng đã xác nhận ứng dụng Cloudflare V1 chạy OK trên iPhone.
- Source có chức năng hội thoại tiếng Việt dùng Web Speech API + OpenAI Text API.
- Có SETUP lưu API key bằng localStorage, nút xóa/thay key, thanh pitch/rate, nghe thử và đặt lại.
- Tồn tại hai URL Cloudflare do deploy temporary. Quyền sở hữu bản sửa mới chưa được xác minh đầy đủ.
- Không có tài khoản người dùng, database hay OpenAI Realtime API.

## Các phiên bản / bằng chứng
- 534d4dd79a93dc897fdcbe59d46447d2adc4b2d1: Cloudflare Voice đầu tiên. GitHub Actions run 43392576969 SUCCESS.
- 81038e70eb41084653ee53f576043e7848c38b43: localStorage cho key, pitch/rate, nghe thử; run 43395672858 SUCCESS.
- Bản tiếp theo: thêm tab BẢO TRÌ trong app, đọc HANDOVER.md / MAINTENANCE.md và COPY BÀN GIAO; cập nhật commit và deployment bằng bằng chứng thực tế.

## Các lỗi và xử lý
- Lovable hết credits và xuất hiện login: bỏ Lovable.
- Apps Script iframe làm Safari báo SpeechRecognition not-allowed: chuyển frontend sang HTTPS Cloudflare Worker độc lập.
- Chẩn đoán ban đầu nhầm “thiếu công cụ Cloudflare”: dùng GitHub Actions + Wrangler đã deploy thành công.
- Không lưu API key: đã thêm lựa chọn lưu tại localStorage trên iPhone.
- AI tự nhận nhầm model: phải dùng cấu hình gpt-4o-mini thật, không tin phát biểu tự suy đoán của model.
- Workflow temporary mỗi lần sinh tài khoản mới: vấn đề còn tồn tại, cần giải quyết trước khi xem là hệ thống CI/CD lâu dài.

## Thứ tự ưu tiên
P0: Xác minh quyền sở hữu Cloudflare Worker đang sử dụng, chuẩn hóa việc deploy vào cùng một URL (không tự tạo temporary).
P1: Rà soát bảo mật và quyền truy cập khi dùng API key ở localStorage.
P1: Kiểm chứng hồi quy iPhone: STT → GPT → TTS → nghe lượt kế; SETUP và pitch/rate.
P2: Kiểm thử chuyển nền, mất mạng, thời gian thoại, báo lỗi rõ ràng.
P2: Đo token và kiểm soát chi phí.

## Quy trình sửa
1. Xác nhận tác vụ/nghiệm thu. 2. Đọc source và kiểm tra commit hiện tại. 3. Xác định Worker đang chạy và quyền deploy. 4. Backup/ghi SHA. 5. Sửa tối thiểu, không phá Voice. 6. Kiểm tra cú pháp và hành vi. 7. Commit + deploy đúng tài khoản. 8. Kiểm tra trang/app trên iPhone. 9. Ghi log với link commit/run/URL, vấn đề chưa đạt.
Không chép API key, token nhận quyền sở hữu, password vào tài liệu hoặc log.

## 13/11/2026 — Giai đoạn B: Tra cứu Internet bằng OpenAI API key hiện có
- Đã loại bỏ giải pháp Brave Search yêu cầu tài khoản/key riêng. Không cần đăng ký thêm search provider.
- Mã nguồn `voice-deploy/worker.js` thêm nút TRA MẠNG bật cho một lượt hỏi; chat bình thường vẫn `gpt-4o-mini`, lượt tra cứu dùng `gpt-5-search-api` qua Chat Completions với chính OpenAI API key ở SETUP.
- Có trích nguồn HTTPS từ annotations, lọc trùng, hiển thị link, loại URL khỏi TTS; thiếu nguồn trả lỗi, không giả vờ đã tra cứu.
- Kiểm thử JavaScript compile và HTTP mock: đã PASS các trường hợp chat bình thường, opt-in, dẫn nguồn, key sai, origin sai, nguồn trống. Bộ test lưu tại `voice-deploy/web-optin.test.mjs`.
- **Chưa triển khai production**, chưa xác thực lượt tìm kiếm thật bằng key người dùng, chưa nghiệm thu Safari iPhone. OpenAI Web Search **có phí**, dù không cần đăng ký dịch vụ khác.
- GitHub Actions tiếp tục fail-closed khi thiếu `NMH_CF_ACCOUNT_ID`/`NMH_CF_API_TOKEN`; không dùng `--temporary`. Worker đang chạy trên Magical Budget giữ nguyên.
- Tài liệu chi tiết: `voice-deploy/STAGE_B_WEB_SEARCH.md`.
