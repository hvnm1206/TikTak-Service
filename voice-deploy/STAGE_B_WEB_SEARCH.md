# NMH VOICE GPT V1 — GIAI ĐOẠN B: TRA CỨU INTERNET
Ngày: 13/11/2026
Nhánh: `nmh-voice-gpt-v1`

## Mục tiêu
Thêm quyền tra cứu Internet khi người dùng chọn, **không cần đăng ký thêm Brave hoặc Search API khác**. Giữ nguyên Voice, SETUP API key, BẢO TRÌ; về sau deploy trên cùng Cloudflare Worker Magical Budget.

## Phương án đã lập trình
- Dùng **OpenAI API key** người dùng đã nhập trong SETUP.
- Chat bình thường giữ `gpt-4o-mini` qua Chat Completions, không kích hoạt công cụ tìm kiếm.
- Trên màn hình NÓI có nút `TRA MẠNG: TẮT`. Bật thành `TRA MẠNG: LƯỢT TỚI`. Chỉ lượt hỏi tiếp theo gọi `gpt-5-search-api` và `web_search_options: {}`, sau đó tự tắt.
- Backend vẫn kiểm tra Origin, định dạng key, messages và kích thước request.
- Lấy `url_citation` từ OpenAI, chỉ cho URL HTTPS, lọc trùng, giới hạn 5; hiển thị link nguồn có thể bấm trong lịch sử.
- Đọc giọng loại URL và markdown link; thiếu citations báo lỗi rõ.
- Đã xóa module và test Brave không còn sử dụng.

## Bằng chứng kiểm tra mã
- `voice-deploy/worker.js`: UI + backend tích hợp.
- `voice-deploy/web-optin.test.mjs`: 7 ca kiểm thử tự động cho Node 22. Chạy: `node --test voice-deploy/web-optin.test.mjs`.
- Kiểm thử trong môi trường JavaScript với mock HTTP: Worker và script HTML biên dịch thành công, giữ nguyên model chat thường, chọn model web đúng khi opt-in, lọc nguồn, chống Origin sai, key sai và câu trả lời thiếu nguồn.
- Test giả lập **không đồng nghĩa** live API PASS.

## Điều kiện chưa xác minh
- Chưa gọi tìm kiếm thật bằng OpenAI key người dùng; tài khoản cần có quyền dùng model `gpt-5-search-api`.
- Web search OpenAI **có phí riêng**, khác với việc không cần đăng ký thêm tài khoản.
- Chưa deploy Worker production vì GitHub Actions chưa có Cloudflare credentials đã được chứng thực và chưa xác minh rollback.
- Chưa nghiệm thu trên iPhone.

## Nghiệm thu cuối
1. Dùng key hiện có của người dùng trên thiết bị, thử tìm kiếm Internet thật.
2. Xác nhận link nguồn/đọc giọng và chat thường không tìm kiếm.
3. Chuẩn bị rollback và chứng thực quyền cập nhật Worker `nmh-voice-gpt-test.magical-budget.workers.dev`.
4. Deploy giữ URL, kiểm thử Safari iPhone.
5. Ghi SHA, workflow, URL, test và phát sinh phí vào MAINTENANCE.

API: https://developers.openai.com/api/docs/guides/tools-web-search
Pricing: https://developers.openai.com/api/docs/pricing
