# NMH Voice — Web Search V2 Lab / kiểm chứng 14-11-2026

**Mục tiêu:** nâng cấp tìm kiếm thông tin hiện thời, không làm hỏng micro, STT, GPT nói chuyện thường hoặc TTS Marin.

## Đã xây dựng
- Nhánh: `nmh-voice-search-isolated-v2`, chứa module `isolated-web-search.js`, test tự động, trang `/search-lab`, workflow kiểm thử và staging.
- Worker staging riêng: https://nmh-voice-search-lab-v2.magical-budget.workers.dev (version `0b8fdbda-b626-4a09-ba35-720483ee9886`).
- Trang test bằng văn bản: https://nmh-voice-search-lab-v2.magical-budget.workers.dev/search-lab.
- Worker production `nmh-voice-gpt-test` và version `8cc6032c-0035-414c-8217-7ea5e91825e5` giữ nguyên.

## Quy cách phần tìm kiếm
- GPT-6 Luna qua Responses API chính thức hỗ trợ Web Search theo https://developers.openai.com/api/docs/models/gpt-6-luna.
- Cho phép host tool `web_search` với `search_context_size=low`, ép gọi công cụ nếu backend phân loại câu hỏi cần dữ liệu mới; tối đa một yêu cầu Responses mỗi lượt tìm kiếm, số lần search tool thực tế do OpenAI quyết định và trả trong kết quả.
- Chỉ dùng khi staging env bật và câu hỏi liên quan tin tức/giá/phiên bản/thông tin hiện tại; các câu hỏi trò chuyện đi đúng GPT agent cũ. Phân loại là heuristic, có thể bỏ sót một số câu hỏi. Không tuyên bố mọi câu hỏi mới đều tự tìm chính xác.
- Chỉ trả kết quả thành công khi có `web_search_call`, có output text và URL citations; loại URI không phải HTTP(S), khử trùng lặp, tối đa 6 nguồn.
- Nếu lỗi tìm kiếm: trả lời có thể đọc, không giả nguồn hay đoán giá; cảnh báo chi phí không xác định khi thất bại.
- Giá công cụ đối chiếu https://developers.openai.com/api/docs/pricing: $10/1000 lượt web search + token. Đây là ước tính, không phải hóa đơn. Chi phí tool cộng vào báo cáo tổng của frontend qua response backend, giữ nguyên JS phía iPhone.

## Kết quả đã kiểm chứng
- CI lab [43530262836](https://github.com/hvnm1206/TikTak-Service/actions/runs/43530262836): 52 test, 48 PASS, 4 SKIPPED (các trường hợp Safari baseline chưa khắc phục; phải tách thành đợt khác), 0 FAIL. Browser Voice UI và script nguồn đúng bản production baseline SHA `3a40173817ab9f8bc4e93ce2c73bfd9d75ac1a03`.
- Deploy staging [43530262638](https://github.com/hvnm1206/TikTak-Service/actions/runs/43530262638): SUCCESS, smoke HTTP 200, invalid key bị từ chối 400, production health PASS, tách Worker đúng.
- Guard read-only kiểm tra độc lập: staging /search-lab HTTP 200; staging / có NÓI; production /search-lab 404; production /health 200. Tất cả không sử dụng key OpenAI.
- Chưa có bằng chứng một lượt Web Search có phí chạy thực với key người dùng và trả nguồn mới. Không có bằng chứng iPhone E2E staging, chưa nghiệm thu về thời gian/chi phí thật.

## Gate bắt buộc trước production
1. Người dùng nhập key *chỉ trong trang staging* `/search-lab`, nhấn thử giá mới nhất; chụp câu trả lời, nguồn/giờ. Key không lưu trong localStorage ở trang test.
2. Trên trang gốc staging người dùng nhập key trong SETUP (khác origin với production), thử ít nhất 1 lượt NÓI thông thường và 1 lượt NÓI cần tìm web. Kiểm tra Marin đọc và nghe lại; thử khi lỗi để không treo.
3. Kiểm tra xấp xỉ chi phí trong OpenAI Usage và xác nhận chấp nhận phí.
4. Chỉ khi 1–3 PASS mới cấp phép triển khai vào Worker production với guard, full CI, snapshot+rollback, và thiết bị nghiệm thu ngay sau deploy.

**Kết luận:** hạ tầng staging và tích hợp kỹ thuật có bằng chứng PASS; chất lượng paid web search và iPhone E2E chưa được nghiệm thu. **Production không thay đổi.**
