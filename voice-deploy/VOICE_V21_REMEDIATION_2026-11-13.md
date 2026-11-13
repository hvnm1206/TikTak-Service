# NMH Voice GPT V2.1 — đợt sửa an toàn 13/11/2026

## Điểm xác minh trước phát hành
- Nhánh duy nhất: `nmh-voice-gpt-v1`; giữ nguyên `main`.
- Bản production đầu đợt: Cloudflare version `aa8866ec-09e4-4ee7-8234-6e62682cca15`, Worker `nmh-voice-gpt-test`.
- CI source commit `6733820c6800c557b8d4cb68d5434e032890d7c1`: 20/20 PASS, deploy SKIPPED.
- CI commit tăng cường smoke `46adf4cb9b646ec009003addbccd8167073e50be`: 20/20 PASS, Cloudflare token ACTIVE, API deployment READ_OK, active version vẫn là `aa8866ec-09e4-4ee7-8234-6e62682cca15`.
- **Chưa có kiểm thử API thật với khóa người dùng, thử nghe iPhone hoặc số tiền từ hóa đơn OpenAI.** Không được coi 20 mock tests là end-to-end.

## Sửa đưa vào gói release
- F11: workflow lưu snapshot phiên bản active có định danh/health hợp lệ trước deployment, rollback về đúng phiên bản vừa ghi nếu smoke fail; không chốt baseline cũ.
- F07: ước tính GPT-6 Luna Standard short context ở mức 0,05 USD / triệu input, 0,25 USD / triệu output, 0,005 USD / triệu cached input; tính riêng cached tokens, số lượt API.
- F02 (một phần): sổ ước phí cục bộ theo ngày/tháng; GPT từ usage trả về; TTS theo thời lượng âm thanh đã giải mã trên thiết bị và mức 0,015 USD/phút **ước tính**; đếm chunks, lỗi. Không lưu khóa hoặc câu nói vào sổ. **Không phải chi phí hóa đơn, không tính token chữ TTS, retries lỗi hoặc dịch vụ ngoài.**
- F13: tab BẢO TRÌ → BÀN GIAO đọc `voice-deploy/START_HERE_NEXT_CHAT.md`, không đọc handover cũ; sửa UI không còn hứa chuyển Safari fallback.
- F15 (một phần): AbortSignal.any hợp nhất timeout 22 giây với abort phía ngoài cho Responses API. Chưa tối ưu timeout tất cả nguồn tool.

## Ưu tiên F01–F16
| Thứ tự | ID | Mức | Công việc cần nghiệm thu | Trạng thái trước release |
|---:|---|---|---|---|
| 1 | F01 | P0 | Chuyển TTS sang `gpt-realtime-2.1-mini` qua Realtime API trước 06/01/2027, giữ trải nghiệm Marin và kiểm phí | CHƯA |
| 2 | F11 | P0 | Dynamic rollback snapshot, probe health trước thay đổi, smoke & rollback khi lỗi | CODE + CI PASS, chờ production |
| 3 | F06 | P0 | Kiểm thử iPhone mic → GPT thật → TTS thật → playback; đánh giá latency/giọng | CHƯA |
| 4 | F02 | P1 | Ghi cả GPT và audio usage cùng trace ID; đối chiếu Organization Usage/Costs thực | MỘT PHẦN: ước phí local, chưa usage hóa đơn |
| 5 | F03 | P1 | Thiết lập hạn mức billing/chi phí đủ mạnh tại OpenAI Project và cảnh báo | CHƯA |
| 6 | F04 | P1 | TTS chồng pipeline/buffer để giảm khoảng ngắt | CHƯA |
| 7 | F08 | P1 | Đo tác động speed=0.756 & playbackRate=1.455 tới audio tokens thực | CHƯA |
| 8 | F07 | P1 | Giá Luna Standard short/cached, unit test | CODE + CI PASS |
| 9 | F10 | P1 | Cloudflare observability và lưu metadata tối thiểu; không log khóa/nội dung nhạy cảm | CHƯA |
| 10 | F15 | P1 | Timeout chung và tool budget hợp lý | MỘT PHẦN |
| 11 | F09 | P2 | Phân tích key plaintext localStorage, chọn lưu theo phiên hoặc bảo vệ nâng cao | CHƯA |
| 12 | F05 | P2 | Nguồn web rộng có provenance, kiểm soát phí | CHƯA |
| 13 | F12 | P2 | Điều khoản Open-Meteo phi thương mại, SLA nguồn và gói thương mại | CHƯA |
| 14 | F14 | P2 | Giới hạn Safari khi nền/khóa màn hình; không hứa hands-free 24/7 | ĐÃ GHI TRONG UI, chưa thay kiến trúc |
| 15 | F16 | P2 | Xử lý địa điểm trùng, RSS parser chắc chắn | CHƯA |
| 16 | F13 | P2 | Một điểm bàn giao chuẩn và UI chính xác | CODE + CI PASS |

## Gate phát hành
1. Release được khởi động qua GitHub Actions từ nhánh chính thức; không dùng `--temporary`.
2. Workflow lấy `active version ID` từ Cloudflare, từ chối split traffic hoặc sai định danh app, ghi biến `NMH_STABLE_VERSION`.
3. `wrangler deploy` giữ nguyên Worker name/URL. Sau deploy: /health, UI có persona, nút Marin, AudioContext, usageSummary, GET /api/docs/handover chuẩn, POST chat và TTS với key sai phải HTTP 400.
4. Khi bất kỳ bước phát hành/smoke thất bại, `trap rollback ERR` gọi `wrangler rollback` về version trước; nếu rollback lỗi, báo lỗi và không kết luận thành công.
5. Cần ghi lại run ID, log, version thực tế sau deploy; kiểm tra GET production read-only sau đó.
6. Chưa có test TTS/Chat với API key thật thì **không được công bố F01/F02/F06 đã hoàn thành hoặc chi phí thực đạt mục tiêu**.

## TTS deprecation — bằng chứng
- https://developers.openai.com/api/docs/deprecations
- https://developers.openai.com/api/docs/guides/text-to-speech
- `gpt-4o-mini-tts`, `tts-1`, `tts-1-hd` ngừng 06/01/2027.
- `gpt-realtime-2.1-mini` dùng Realtime API, không thay thế trực tiếp ở `/v1/audio/speech`.
- Model mới audio output niêm yết 20 USD/triệu audio tokens. Chưa đủ thông tin quy đổi token ra phút để kết luận rẻ hơn/đắt hơn.

## Giới hạn
- Khóa OpenAI do người dùng giữ trên thiết bị BYOK, công cụ hiện không truy cập Usage/Costs của chính khóa đó; số trong app là ước tính.
- Không thu hoặc lưu khóa người dùng vào GitHub/Cloudflare source.
- Không có bằng chứng nghe trực tiếp trên iPhone trong lần sửa này.
